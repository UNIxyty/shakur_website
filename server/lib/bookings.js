import {
  supabase,
  isDateStr,
  isTimeStr,
  isEmailStr,
  isNameStr,
  isNotesStr,
  isLocale,
  isToken,
} from './shared.js';
import {
  getAvailability,
  getScheduledMeetings,
  timesForDay,
  bookingWindow,
} from './slots.js';
import { sendConfirmation, sendCanceled, sendRescheduled } from './email.js';

/**
 * A slot is bookable when it is inside the lead-time/horizon window and still
 * open once existing scheduled meetings (+buffer) and blockouts are applied.
 * `ignoreId` lets a reschedule not collide with the meeting being moved.
 */
async function slotIsFree(date, time, ignoreId = null) {
  const { min, max } = bookingWindow();
  if (date < min || date > max) return { ok: false, reason: 'Date is outside the booking window' };

  const availability = await getAvailability();
  if (!availability) return { ok: false, reason: 'Availability is not configured', code: 503 };

  let meetings = await getScheduledMeetings(date, date);
  if (ignoreId) meetings = meetings.filter((m) => m.id !== ignoreId);
  const times = timesForDay(availability, meetings, date);
  if (!times.includes(time)) return { ok: false, reason: 'That time is no longer available' };
  return { ok: true, availability };
}

async function meetingByToken(token) {
  const { data, error } = await supabase.from('meetings').select('*').eq('token', token).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

/** POST /api/bookings — { name, email, phone?, notes?, date, time, locale } */
export async function handleCreateBooking(req, res) {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured' });

  const { name, email, phone, notes, date, time, locale } = req.body || {};
  if (!isNameStr(name)) return res.status(400).json({ error: 'Invalid name' });
  if (!isEmailStr(email)) return res.status(400).json({ error: 'Invalid email' });
  if (phone != null && (typeof phone !== 'string' || phone.length > 40)) {
    return res.status(400).json({ error: 'Invalid phone' });
  }
  if (notes != null && !isNotesStr(notes)) {
    return res.status(400).json({ error: 'Notes too long (max 2000 chars)' });
  }
  if (!isDateStr(date)) return res.status(400).json({ error: 'Invalid date (YYYY-MM-DD)' });
  if (!isTimeStr(time)) return res.status(400).json({ error: 'Invalid time (HH:MM)' });

  try {
    const free = await slotIsFree(date, time);
    if (!free.ok) return res.status(free.code || 409).json({ error: free.reason });

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        name: name.trim(),
        email: email.trim(),
        phone: (phone || '').trim(),
        notes: notes || '',
        meeting_date: date,
        meeting_time: time,
        duration_min: free.availability.slot_minutes,
        status: 'scheduled',
        locale: isLocale(locale) ? locale : 'en',
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await sendConfirmation(meeting); // best effort — never fails the booking
    res.json({ ok: true, token: meeting.token });
  } catch (err) {
    console.error('[bookings:create]', err.message);
    res.status(502).json({ error: 'Could not create the booking' });
  }
}

/** GET /api/bookings/:token — public-safe subset only (no email/phone/notes). */
export async function handleGetBooking(req, res) {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured' });
  if (!isToken(req.params.token)) return res.status(400).json({ error: 'Invalid token' });

  try {
    const m = await meetingByToken(req.params.token);
    if (!m) return res.status(404).json({ error: 'Booking not found' });
    res.json({
      name: m.name,
      date: m.meeting_date,
      time: m.meeting_time,
      duration_min: m.duration_min,
      status: m.status,
    });
  } catch (err) {
    console.error('[bookings:get]', err.message);
    res.status(502).json({ error: 'Could not load the booking' });
  }
}

/** POST /api/bookings/:token/cancel */
export async function handleCancelBooking(req, res) {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured' });
  if (!isToken(req.params.token)) return res.status(400).json({ error: 'Invalid token' });

  try {
    const m = await meetingByToken(req.params.token);
    if (!m) return res.status(404).json({ error: 'Booking not found' });
    if (m.status !== 'scheduled') {
      return res.status(409).json({ error: `Booking is already ${m.status}` });
    }

    const { error } = await supabase.from('meetings').update({ status: 'canceled' }).eq('id', m.id);
    if (error) throw new Error(error.message);

    await sendCanceled({ ...m, status: 'canceled' }, 'This meeting was canceled at your request.');
    res.json({ ok: true });
  } catch (err) {
    console.error('[bookings:cancel]', err.message);
    res.status(502).json({ error: 'Could not cancel the booking' });
  }
}

/** POST /api/bookings/:token/reschedule — { date, time } */
export async function handleRescheduleBooking(req, res) {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured' });
  if (!isToken(req.params.token)) return res.status(400).json({ error: 'Invalid token' });
  const { date, time } = req.body || {};
  if (!isDateStr(date)) return res.status(400).json({ error: 'Invalid date (YYYY-MM-DD)' });
  if (!isTimeStr(time)) return res.status(400).json({ error: 'Invalid time (HH:MM)' });

  try {
    const m = await meetingByToken(req.params.token);
    if (!m) return res.status(404).json({ error: 'Booking not found' });
    if (m.status !== 'scheduled') {
      return res.status(409).json({ error: `Booking is already ${m.status}` });
    }

    const free = await slotIsFree(date, time, m.id);
    if (!free.ok) return res.status(free.code || 409).json({ error: free.reason });

    const { data: updated, error } = await supabase
      .from('meetings')
      .update({ meeting_date: date, meeting_time: time, reminder_sent_at: null })
      .eq('id', m.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await sendRescheduled(updated, m.meeting_date, m.meeting_time);
    res.json({ ok: true });
  } catch (err) {
    console.error('[bookings:reschedule]', err.message);
    res.status(502).json({ error: 'Could not reschedule the booking' });
  }
}

// ---------------------------------------------------------------------------
// Admin endpoints — Authorization: Bearer <supabase access token>
// ---------------------------------------------------------------------------

export async function requireAdmin(req, res, next) {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured' });
  const auth = req.headers.authorization || '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!jwt) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const { data, error } = await supabase.auth.getUser(jwt);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired token' });
    req.adminUser = data.user;
    next();
  } catch (err) {
    console.error('[auth]', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const isUuid = (v) =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** POST /api/admin/meetings/:id/cancel — { note? } */
export async function handleAdminCancel(req, res) {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid meeting id' });
  const { note } = req.body || {};
  if (note != null && !isNotesStr(note)) {
    return res.status(400).json({ error: 'Note too long (max 2000 chars)' });
  }

  try {
    const { data: m, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!m) return res.status(404).json({ error: 'Meeting not found' });
    if (m.status !== 'scheduled') {
      return res.status(409).json({ error: `Meeting is already ${m.status}` });
    }

    const { error: upErr } = await supabase
      .from('meetings')
      .update({ status: 'canceled' })
      .eq('id', m.id);
    if (upErr) throw new Error(upErr.message);

    await sendCanceled({ ...m, status: 'canceled' }, note);
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin:cancel]', err.message);
    res.status(502).json({ error: 'Could not cancel the meeting' });
  }
}

/** POST /api/admin/meetings/:id/reschedule — { date, time } */
export async function handleAdminReschedule(req, res) {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: 'Invalid meeting id' });
  const { date, time } = req.body || {};
  if (!isDateStr(date)) return res.status(400).json({ error: 'Invalid date (YYYY-MM-DD)' });
  if (!isTimeStr(time)) return res.status(400).json({ error: 'Invalid time (HH:MM)' });

  try {
    const { data: m, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!m) return res.status(404).json({ error: 'Meeting not found' });
    if (m.status !== 'scheduled') {
      return res.status(409).json({ error: `Meeting is already ${m.status}` });
    }

    const free = await slotIsFree(date, time, m.id);
    if (!free.ok) return res.status(free.code || 409).json({ error: free.reason });

    const { data: updated, error: upErr } = await supabase
      .from('meetings')
      .update({ meeting_date: date, meeting_time: time, reminder_sent_at: null })
      .eq('id', m.id)
      .select('*')
      .single();
    if (upErr) throw new Error(upErr.message);

    await sendRescheduled(updated, m.meeting_date, m.meeting_time);
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin:reschedule]', err.message);
    res.status(502).json({ error: 'Could not reschedule the meeting' });
  }
}

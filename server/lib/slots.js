import {
  supabase,
  TIMEZONE,
  isDateStr,
  toMin,
  fromMin,
  addDays,
  weekdayName,
  zonedDateStr,
} from './shared.js';

export const LEAD_DAYS = 1; // earliest bookable day = tomorrow (Europe/Riga)
export const HORIZON_DAYS = 60;

export async function getAvailability() {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(`availability query failed: ${error.message}`);
  return data; // null when the row was never seeded
}

export async function getScheduledMeetings(fromDate, toDate) {
  const { data, error } = await supabase
    .from('meetings')
    .select('id, meeting_date, meeting_time, duration_min')
    .eq('status', 'scheduled')
    .gte('meeting_date', fromDate)
    .lte('meeting_date', toDate);
  if (error) throw new Error(`meetings query failed: ${error.message}`);
  return data || [];
}

/** Open times for one calendar day. Pure — easy to reason about and test. */
export function timesForDay(availability, meetings, date) {
  const { week, slot_minutes: slot, buffer_minutes: buffer, blockouts } = availability;
  if ((blockouts || []).includes(date)) return [];
  const day = week?.[weekdayName(date)];
  if (!day || !day.on) return [];

  const busy = meetings
    .filter((m) => m.meeting_date === date)
    .map((m) => {
      const start = toMin(m.meeting_time);
      return { start: start - buffer, end: start + m.duration_min + buffer };
    });

  const times = [];
  const startMin = toMin(day.start);
  const endMin = toMin(day.end);
  for (let t = startMin; t + slot <= endMin; t += slot) {
    const blocked = busy.some((b) => t < b.end && b.start < t + slot);
    if (!blocked) times.push(fromMin(t));
  }
  return times;
}

export function bookingWindow() {
  const today = zonedDateStr(TIMEZONE);
  return { min: addDays(today, LEAD_DAYS), max: addDays(today, HORIZON_DAYS) };
}

/** GET /api/slots?from&to — { slots: [{ date, times: [...] }] } */
export async function handleSlots(req, res) {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured' });

  const { min, max } = bookingWindow();
  let from = isDateStr(req.query.from) ? req.query.from : min;
  let to = isDateStr(req.query.to) ? req.query.to : max;
  // Clamp to the bookable window rather than erroring.
  if (from < min) from = min;
  if (to > max) to = max;
  if (to < from) return res.json({ slots: [] });

  try {
    const availability = await getAvailability();
    if (!availability) return res.status(503).json({ error: 'Availability is not configured' });
    const meetings = await getScheduledMeetings(from, to);

    const slots = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const times = timesForDay(availability, meetings, date);
      if (times.length) slots.push({ date, times });
    }
    res.json({ slots });
  } catch (err) {
    console.error('[slots]', err.message);
    res.status(502).json({ error: 'Could not load availability' });
  }
}

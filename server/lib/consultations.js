import { supabase, isNameStr, isEmailStr, isLocale } from './shared.js';
import { sendConsultationNotice } from './email.js';

/**
 * POST /api/consultations — { name, phone, email, message?, locale? }
 *
 * Hero "Request a Consultation" leads. The row is inserted with the
 * service-role key (consultation_requests has no anon policies — requester
 * PII stays server-side), then an admin notification email goes to
 * SUPPORT_EMAIL best-effort: a provider failure is logged, the request still
 * succeeds — same policy as bookings.
 */
export async function handleCreateConsultation(req, res) {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured' });

  const { name, phone, email, message, locale } = req.body || {};
  if (!isNameStr(name)) return res.status(400).json({ error: 'Invalid name' });
  const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
  if (trimmedPhone.length < 5 || trimmedPhone.length > 40) {
    return res.status(400).json({ error: 'Invalid phone (5–40 characters)' });
  }
  if (!isEmailStr(email)) return res.status(400).json({ error: 'Invalid email' });
  if (message != null && (typeof message !== 'string' || message.length > 2000)) {
    return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
  }

  try {
    const { data: request, error } = await supabase
      .from('consultation_requests')
      .insert({
        name: name.trim(),
        phone: trimmedPhone,
        email: email.trim(),
        message: message || '',
        locale: isLocale(locale) ? locale : 'en',
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await sendConsultationNotice(request); // best effort — never fails the request
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[consultations:create]', err.message);
    res.status(502).json({ error: 'Could not submit the request' });
  }
}

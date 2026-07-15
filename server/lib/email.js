import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, TIMEZONE, zonedToUtc } from './shared.js';

const here = dirname(fileURLToPath(import.meta.url));
// Repo layout: server/lib -> ../../emails. Docker layout: /app/lib -> ../emails.
const EMAILS_DIR = [join(here, '..', '..', 'emails'), join(here, '..', 'emails')].find((d) =>
  existsSync(join(d, '1-confirmation.html')),
);

const cache = new Map();
function template(name) {
  if (!cache.has(name)) {
    if (!EMAILS_DIR) throw new Error('emails/ directory not found');
    cache.set(name, readFileSync(join(EMAILS_DIR, name), 'utf8'));
  }
  return cache.get(name);
}

/** Tiny mustache-lite: replaces {{var}} with vars[var] (missing -> ''). */
export function render(tpl, vars) {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) =>
    vars[key] == null ? '' : String(vars[key]),
  );
}

/** For visitor-typed values rendered into HTML templates (never trust PII). */
function escapeHtml(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * emails/3-canceled-or-rescheduled.html holds BOTH variants; split on the
 * VARIANT A / VARIANT B comment markers (per the template's own instructions).
 * The shared <head> (styles/meta) is kept for each variant.
 */
function splitVariants(src) {
  const aStart = src.search(/=+ VARIANT A/);
  const aEnd = src.search(/=+ END VARIANT A/);
  const bStart = src.search(/=+ VARIANT B/);
  const bEnd = src.search(/=+ END VARIANT B/);
  const head = src.slice(0, src.lastIndexOf('<!--', aStart));
  const tail = '\n</body>\n</html>\n';
  return {
    A: head + src.slice(src.lastIndexOf('<!--', aStart), src.lastIndexOf('<!--', aEnd)) + tail,
    B: head + src.slice(src.lastIndexOf('<!--', bStart), src.lastIndexOf('<!--', bEnd)) + tail,
  };
}

/** The .txt templates carry their own "Subject: …" first line — pull it out. */
function subjectAndBody(txt) {
  const m = txt.match(/^\s*Subject:\s*(.+)\s*$/m);
  const subject = m ? m[1].trim() : 'SHAKUR';
  const body = txt.replace(/^\s*Subject:.*$/m, '').replace(/^\s+/, '');
  return { subject, body };
}

function txtVariant(which) {
  const src = template('3-canceled-or-rescheduled.txt');
  // Each txt variant starts at its "=== VARIANT X ===" banner line.
  const parts = src.split(/^=+ .*VARIANT [AB].*=+$/m);
  // parts: [preamble, variant A, variant B]
  const body = which === 'A' ? parts[1] : parts[2];
  return subjectAndBody(body || '');
}

// ---------------------------------------------------------------------------
// ICS builder — minimal, UTC times, one VEVENT.
// ---------------------------------------------------------------------------
const icsStamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function buildIcs({ token, date, time, durationMin, attendeeName }) {
  const start = zonedToUtc(TIMEZONE, date, time);
  const end = new Date(start.getTime() + durationMin * 60000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SHAKUR//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${token}@shakur`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    'SUMMARY:SHAKUR consultation',
    `DESCRIPTION:Consultation with SHAKUR${attendeeName ? ` for ${attendeeName}` : ''}. Manage: ${env.publicUrl}/booking/${token}`,
    'LOCATION:Email or Zoom',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------
export function humanDate(dateStr) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateStr}T00:00:00Z`));
}

function baseVars(meeting) {
  const manage = `${env.publicUrl}/booking/${meeting.token}`;
  return {
    attendee_name: meeting.name,
    host_name: 'SHAKUR',
    company_name: 'SIA SHAKUR',
    meeting_date: humanDate(meeting.meeting_date),
    meeting_time: meeting.meeting_time,
    duration: `${meeting.duration_min} min`,
    timezone: TIMEZONE,
    location_or_link: 'Email or Zoom',
    reschedule_link: manage,
    cancel_link: `${manage}?action=cancel`,
    booking_link: `${env.publicUrl}/contact`,
    support_email: env.supportEmail,
  };
}

let resendClient = null;
async function getResend() {
  if (!env.resendKey) return null;
  if (!resendClient) {
    const { Resend } = await import('resend');
    resendClient = new Resend(env.resendKey);
  }
  return resendClient;
}

/**
 * Best-effort delivery: a missing RESEND_API_KEY or a provider error is logged
 * but never fails the booking flow itself.
 */
async function deliver({ to, subject, html, text, attachments }) {
  const resend = await getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not configured — skipping:', subject);
    return { skipped: true };
  }
  try {
    const { error } = await resend.emails.send({
      from: env.resendFrom,
      to,
      subject,
      html,
      text,
      attachments,
    });
    if (error) throw new Error(error.message || String(error));
    return { sent: true };
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return { error: err.message };
  }
}

export async function sendConfirmation(meeting) {
  const vars = baseVars(meeting);
  const { subject, body } = subjectAndBody(template('1-confirmation.txt'));
  return deliver({
    to: meeting.email,
    subject: render(subject, vars),
    html: render(template('1-confirmation.html'), vars),
    text: render(body, vars),
    attachments: [
      {
        filename: 'shakur-consultation.ics',
        content: Buffer.from(
          buildIcs({
            token: meeting.token,
            date: meeting.meeting_date,
            time: meeting.meeting_time,
            durationMin: meeting.duration_min,
            attendeeName: meeting.name,
          }),
        ).toString('base64'),
      },
    ],
  });
}

export async function sendReminder(meeting, timeUntil) {
  const vars = { ...baseVars(meeting), time_until: timeUntil };
  const { subject, body } = subjectAndBody(template('2-reminder.txt'));
  return deliver({
    to: meeting.email,
    subject: render(subject, vars),
    html: render(template('2-reminder.html'), vars),
    text: render(body, vars),
  });
}

export async function sendCanceled(meeting, note) {
  const vars = {
    ...baseVars(meeting),
    cancellation_note: note || 'No additional details were provided.',
  };
  const html = splitVariants(template('3-canceled-or-rescheduled.html')).A;
  const { subject, body } = txtVariant('A');
  return deliver({
    to: meeting.email,
    subject: render(subject, vars),
    html: render(html, vars),
    text: render(body, vars),
  });
}

/**
 * Admin notification for a new consultation request (emails/4). Goes to
 * SUPPORT_EMAIL, not the visitor — so the vars carry the visitor's PII and
 * every visitor-typed value is HTML-escaped for the .html variant.
 */
export async function sendConsultationNotice(request) {
  const vars = {
    name: request.name,
    phone: request.phone,
    email: request.email,
    message: request.message || '—',
    locale: request.locale,
    created_at: new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: TIMEZONE,
    }).format(new Date(request.created_at)),
    admin_link: `${env.publicUrl}/admin`,
  };
  const htmlVars = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, k === 'admin_link' ? v : escapeHtml(v)]),
  );
  // Keep the visitor's line breaks readable in the HTML card.
  htmlVars.message = htmlVars.message.replace(/\r?\n/g, '<br>');

  const { subject, body } = subjectAndBody(template('4-consultation-request.txt'));
  return deliver({
    to: env.supportEmail,
    subject: render(subject, vars),
    html: render(template('4-consultation-request.html'), htmlVars),
    text: render(body, vars),
  });
}

export async function sendRescheduled(meeting, oldDate, oldTime) {
  const vars = {
    ...baseVars(meeting),
    // In variant B, meeting_date/time are the PREVIOUS slot.
    meeting_date: humanDate(oldDate),
    meeting_time: oldTime,
    new_meeting_date: humanDate(meeting.meeting_date),
    new_meeting_time: meeting.meeting_time,
  };
  const html = splitVariants(template('3-canceled-or-rescheduled.html')).B;
  const { subject, body } = txtVariant('B');
  return deliver({
    to: meeting.email,
    subject: render(subject, vars),
    html: render(html, vars),
    text: render(body, vars),
  });
}

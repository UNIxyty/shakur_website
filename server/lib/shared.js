import { createClient } from '@supabase/supabase-js';

export const env = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  openaiKey: process.env.OPENAI_API_KEY || '',
  resendKey: process.env.RESEND_API_KEY || '',
  resendFrom: process.env.RESEND_FROM || 'SHAKUR <bookings@shakur.lv>',
  // v3 renamed PUBLIC_URL -> PUBLIC_BASE_URL (domain migration); the old name
  // still works as a fallback so a not-yet-updated .env keeps sending links.
  publicUrl: (process.env.PUBLIC_BASE_URL || process.env.PUBLIC_URL || '').replace(/\/+$/, ''),
  supportEmail: process.env.SUPPORT_EMAIL || 'info@shakur.lv',
  // Where POST /api/media stores files (compose mounts the `media-uploads`
  // volume here; nginx serves the same volume read-only at /media/).
  mediaDir: process.env.MEDIA_DIR || '/data/media',
};

// Service-role client — bypasses RLS. Server-side only; never expose this key.
export const supabase =
  env.supabaseUrl && env.serviceKey
    ? createClient(env.supabaseUrl, env.serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const TIMEZONE = 'Europe/Riga';

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
export const isDateStr = (v) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
export const isTimeStr = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const isEmailStr = (v) =>
  typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isNameStr = (v) =>
  typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 120;
export const isNotesStr = (v) => typeof v === 'string' && v.length <= 2000;
export const isLocale = (v) => v === 'en' || v === 'lv' || v === 'ru';
export const isToken = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(v);

// ---------------------------------------------------------------------------
// Calendar-date helpers ('YYYY-MM-DD' strings; timezone-independent maths)
// ---------------------------------------------------------------------------
export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const fromMin = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const weekdayName = (dateStr) => WEEKDAYS[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];

/** Today's calendar date in a timezone. */
export function zonedDateStr(tz, at = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

function tzOffsetMs(tz, at) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour % 24,
    +parts.minute,
    +parts.second,
  );
  return asUtc - at.getTime();
}

/** A local wall-clock time in `tz` -> UTC Date (DST-aware). */
export function zonedToUtc(tz, dateStr, timeStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes converge across DST transitions.
  let ts = naive - tzOffsetMs(tz, new Date(naive));
  ts = naive - tzOffsetMs(tz, new Date(ts));
  return new Date(ts);
}

// ---------------------------------------------------------------------------
// In-memory rate limiter (per IP, fixed window). No external deps by design.
// ---------------------------------------------------------------------------
export function rateLimiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) {
      return res.status(429).json({ error: 'Too many requests — try again later' });
    }
    list.push(now);
    hits.set(ip, list);
    // Opportunistic cleanup so the map cannot grow unbounded.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (!v.some((t) => now - t < windowMs)) hits.delete(k);
      }
    }
    next();
  };
}

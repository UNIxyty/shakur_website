import { supabase, env, TIMEZONE, zonedToUtc } from './shared.js';
import { sendReminder } from './email.js';

const WINDOW_MS = 24 * 3600 * 1000; // remind when a meeting is <= 24h away
const TICK_MS = 10 * 60 * 1000;

function timeUntilLabel(ms) {
  const hours = Math.max(1, Math.round(ms / 3600000));
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

export async function runReminderPass() {
  if (!supabase || !env.resendKey) return;
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('status', 'scheduled')
    .is('reminder_sent_at', null);
  if (error) {
    console.error('[reminders] query failed:', error.message);
    return;
  }
  const now = Date.now();
  for (const m of data ?? []) {
    const startMs = zonedToUtc(TIMEZONE, m.meeting_date, m.meeting_time).getTime();
    const untilMs = startMs - now;
    if (untilMs <= 0 || untilMs > WINDOW_MS) continue;
    // Mark first so a crash mid-send cannot spam the attendee.
    const { error: upErr } = await supabase
      .from('meetings')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', m.id)
      .is('reminder_sent_at', null);
    if (upErr) {
      console.error('[reminders] mark failed:', upErr.message);
      continue;
    }
    await sendReminder(m, timeUntilLabel(untilMs));
  }
}

export function startReminderLoop() {
  if (!env.resendKey) {
    console.warn('[reminders] RESEND_API_KEY not configured — reminder loop disabled');
    return;
  }
  setTimeout(() => void runReminderPass(), 30_000);
  setInterval(() => void runReminderPass(), TICK_MS).unref();
}

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../lang';
import { SCHEDULING } from '../data';
import { Calendar, Check, ChevronLeft, ChevronRight, Clock, Close, VideoIcon } from './icons';
import { pop } from '../motion';

type Step = 'date' | 'time' | 'details' | 'done';

/**
 * Availability source:
 *  - 'api'     — GET /api/slots for the 60-day window (days without slots disabled)
 *  - 'demo'    — the API is unreachable; fall back to the design's local
 *                SCHEDULING generation and don't persist the booking
 *  - 'loading' — first fetch still in flight (all days disabled)
 */
type SlotSource = 'loading' | 'api' | 'demo';

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Generate the bookable slots for a day from the local scheduling config (demo mode). */
function generateSlots(): string[] {
  const start = toMinutes(SCHEDULING.start);
  const end = toMinutes(SCHEDULING.end);
  const out: string[] = [];
  for (let m = start; m + SCHEDULING.duration <= end; m += SCHEDULING.interval) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    if (out.length > 60) break;
  }
  return out;
}

export default function BookingModal({ onClose }: { onClose: () => void }) {
  const { t, lang } = useLang();

  const [step, setStep] = useState<Step>('date');
  const [monthOffset, setMonthOffset] = useState(0);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [slotSource, setSlotSource] = useState<SlotSource>('loading');
  const [slotMap, setSlotMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // One fetch for the whole 60-day booking window on open.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date();
        const from = isoOf(today);
        const to = isoOf(
          new Date(today.getFullYear(), today.getMonth(), today.getDate() + SCHEDULING.horizonDays)
        );
        const res = await fetch(`/api/slots?from=${from}&to=${to}`);
        if (!res.ok) throw new Error(`slots ${res.status}`);
        const data = (await res.json()) as { slots?: { date: string; times: string[] }[] };
        if (cancelled) return;
        const map: Record<string, string[]> = {};
        for (const s of data.slots ?? []) map[s.date] = s.times;
        setSlotMap(map);
        setSlotSource('api');
      } catch {
        if (!cancelled) setSlotSource('demo');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Localized calendar names (misc.dates leaves are comma-joined, Monday-first).
  const weekdays = t.weekdays_short.split(',');
  const monthsNom = t.months_nom.split(',');
  const monthsRun = t.months_running.split(',');
  const weekdaysLong = t.weekdays_long.split(',');

  const now = new Date();
  const monthBase = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthLabel = `${monthsNom[monthBase.getMonth()]} ${monthBase.getFullYear()}`;

  // Monday-first grid.
  const firstDow = (monthBase.getDay() + 6) % 7;
  const daysInMonth = new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 0).getDate();

  const leadDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + SCHEDULING.leadDays);
  const horizonDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + SCHEDULING.horizonDays
  );

  const cells: ({ blank: true } | { blank: false; day: number; iso: string; disabled: boolean })[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ blank: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const cur = new Date(monthBase.getFullYear(), monthBase.getMonth(), d);
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let disabled: boolean;
    if (slotSource === 'loading') {
      disabled = true;
    } else if (slotSource === 'api') {
      disabled = !(slotMap[iso]?.length) || cur < leadDate || cur > horizonDate;
    } else {
      const dayAllowed = (SCHEDULING.days as readonly number[]).includes(cur.getDay());
      disabled =
        cur < leadDate || cur > horizonDate || !dayAllowed || SCHEDULING.blocked.includes(iso);
    }
    cells.push({ blank: false, day: d, iso, disabled });
  }

  const times = slotSource === 'api' ? (date ? (slotMap[date] ?? []) : []) : generateSlots();

  // "Wednesday, July 15" — same shape per language, words localized
  // (LV "Trešdiena, 15. jūlijs" · RU "Среда, 15 июля" with the genitive month).
  const dateLabel = (() => {
    if (!date) return '';
    const d = new Date(`${date}T00:00:00`);
    const wd = weekdaysLong[(d.getDay() + 6) % 7];
    const month = monthsRun[d.getMonth()];
    if (lang === 'lv') return `${wd}, ${d.getDate()}. ${month}`;
    if (lang === 'ru') return `${wd}, ${d.getDate()} ${month}`;
    return `${wd}, ${month} ${d.getDate()}`;
  })();

  const confirm = async () => {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setErr(t.bk_err);
      return;
    }
    if (slotSource !== 'api') {
      // Demo — nothing to persist; still show the done state.
      setStep('done');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), date, time, locale: lang }),
      });
      if (!res.ok) throw new Error(`bookings ${res.status}`);
      setStep('done');
    } catch {
      setErr(t.bk_api_err);
    } finally {
      setSubmitting(false);
    }
  };

  const backBtn = (to: Step) => (
    <button
      onClick={() => setStep(to)}
      className="inline-flex cursor-pointer items-center border-0 bg-transparent font-medium text-muted"
      style={{ gap: 6, fontSize: 14, padding: '0 0 14px' }}
    >
      <ChevronLeft size={15} strokeWidth={2.2} />
      {t.bk_back}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, background: 'rgba(0,0,0,0.55)', padding: 16 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${SCHEDULING.duration} Min Consultation`}
    >
      <motion.div
        variants={pop}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="overlay-card relative flex overflow-hidden bg-white"
        style={{ borderRadius: 16, width: '100%', maxWidth: 860, height: '80vh', maxHeight: 600 }}
      >
        {/* Sidebar — hidden ≤620px (SHAKUR-Mobile: near-full-screen sheet,
            the desktop side panel disappears; same rule as .consult-aside). */}
        <div
          className="consult-aside flex shrink-0 flex-col bg-ink text-white"
          style={{ width: 290, padding: 30, gap: 18 }}
        >
          <img
            src="/images/shakur-logo.svg"
            alt="SHAKUR"
            className="self-start"
            style={{ height: 19, width: 'auto', filter: 'brightness(0) invert(1)' }}
          />
          <div className="flex flex-col" style={{ gap: 5 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>SIA SHAKUR</span>
            <h3 className="m-0 font-semibold" style={{ fontSize: 22, letterSpacing: '-0.5px' }}>
              {SCHEDULING.duration} Min Consultation
            </h3>
          </div>

          <div className="flex flex-col" style={{ gap: 12, marginTop: 4 }}>
            <div
              className="flex items-center"
              style={{ gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}
            >
              <Clock size={16} />
              {SCHEDULING.duration} minutes
            </div>
            <div
              className="flex items-center"
              style={{ gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}
            >
              <VideoIcon size={16} stroke="#FB8500" />
              {t.bk_medium}
            </div>
            {dateLabel && (
              <div
                className="flex items-center font-semibold"
                style={{ gap: 10, fontSize: 14, color: '#FB8500' }}
              >
                <Calendar size={16} />
                {dateLabel}
                {time ? ` · ${time}` : ''}
              </div>
            )}
          </div>

          <p
            style={{
              marginTop: 'auto',
              fontSize: 12,
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.55,
            }}
          >
            {t.bk_blurb}
          </p>
        </div>

        {/* Step panel */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
          className="overlay-panel relative flex-1 overflow-y-auto"
          style={{ minWidth: 0, padding: '24px 28px' }}
        >
          <button
            onClick={onClose}
            aria-label={t.a11y_close}
            className="overlay-close absolute flex cursor-pointer items-center justify-center border-0 text-muted"
            style={{
              top: 16,
              right: 16,
              width: 34,
              height: 34,
              background: '#F5F5F4',
              borderRadius: 9,
              zIndex: 3,
            }}
          >
            <Close size={18} stroke="currentColor" />
          </button>

          {step === 'date' && (
            <>
              <h3 className="m-0 font-semibold" style={{ marginBottom: 18, fontSize: 17 }}>
                {t.bk_select_date}
              </h3>

              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <button
                  onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
                  aria-label={t.a11y_prev_month}
                  className="flex cursor-pointer items-center justify-center bg-white text-muted"
                  style={{ width: 32, height: 32, border: '1px solid #E7E5E4', borderRadius: 8 }}
                >
                  <ChevronLeft size={15} strokeWidth={2.4} />
                </button>
                <span className="font-semibold" style={{ fontSize: 15 }}>
                  {monthLabel}
                </span>
                <button
                  onClick={() => setMonthOffset((m) => m + 1)}
                  aria-label={t.a11y_next_month}
                  className="flex cursor-pointer items-center justify-center bg-white text-muted"
                  style={{ width: 32, height: 32, border: '1px solid #E7E5E4', borderRadius: 8 }}
                >
                  <ChevronRight size={15} stroke="currentColor" strokeWidth={2.4} />
                </button>
              </div>

              <div
                className="grid"
                style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}
              >
                {weekdays.map((d) => (
                  <span
                    key={d}
                    className="m-t12 text-center font-semibold text-placeholder"
                    style={{ fontSize: 11 }}
                  >
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {cells.map((c, i) =>
                  c.blank ? (
                    <div key={`b${i}`} />
                  ) : (
                    <button
                      key={c.iso}
                      disabled={c.disabled}
                      onClick={() => {
                        setDate(c.iso);
                        setTime(null);
                        setStep('time');
                      }}
                      className="overlay-day border-0 font-medium"
                      style={{
                        aspectRatio: '1',
                        borderRadius: 9,
                        fontSize: 14,
                        cursor: c.disabled ? 'default' : 'pointer',
                        background: date === c.iso ? '#FB8500' : c.disabled ? 'transparent' : '#F5F5F4',
                        color: date === c.iso ? '#160C00' : c.disabled ? '#D6D3D1' : '#160C00',
                        opacity: c.disabled ? 0.5 : 1,
                      }}
                    >
                      {c.day}
                    </button>
                  )
                )}
              </div>

              {slotSource === 'loading' && (
                <p className="m-0 text-placeholder" style={{ marginTop: 14, fontSize: 13 }}>
                  {t.bk_loading}
                </p>
              )}
            </>
          )}

          {step === 'time' && (
            <>
              {backBtn('date')}
              <h3 className="m-0 font-semibold" style={{ marginBottom: 4, fontSize: 17 }}>
                {t.bk_select_time}
              </h3>
              <p className="m-0 text-muted" style={{ marginBottom: 18, fontSize: 14 }}>
                {dateLabel}
              </p>

              {times.length === 0 && (
                <p className="m-0 text-placeholder" style={{ fontSize: 14 }}>
                  {t.bk_no_times}
                </p>
              )}
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {times.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => {
                      setTime(slot);
                      setStep('details');
                    }}
                    className="cursor-pointer bg-white text-ink font-semibold transition-colors hover:border-orange hover:text-orange"
                    style={{
                      border: '1.5px solid #E7E5E4',
                      borderRadius: 10,
                      fontSize: 15,
                      padding: 13,
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'details' && (
            <>
              {backBtn('time')}
              <h3 className="m-0 font-semibold" style={{ marginBottom: 4, fontSize: 17 }}>
                {t.bk_your_details}
              </h3>
              <p
                className="m-0 font-semibold text-orange"
                style={{ marginBottom: 18, fontSize: 14 }}
              >
                {dateLabel} · {time}
              </p>

              <div className="flex flex-col" style={{ gap: 14, maxWidth: 380 }}>
                <label className="flex flex-col font-semibold" style={{ gap: 7, fontSize: 13 }}>
                  {t.bk_full_name}
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErr('');
                    }}
                    placeholder={t.bk_name_ph}
                    className="overlay-field outline-none"
                    style={{
                      border: '1px solid #E7E5E4',
                      borderRadius: 10,
                      padding: '12px 13px',
                      fontSize: 15,
                    }}
                  />
                </label>

                <label className="flex flex-col font-semibold" style={{ gap: 7, fontSize: 13 }}>
                  {t.bk_email}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErr('');
                    }}
                    placeholder={t.ph_email}
                    className="overlay-field outline-none"
                    style={{
                      border: '1px solid #E7E5E4',
                      borderRadius: 10,
                      padding: '12px 13px',
                      fontSize: 15,
                    }}
                  />
                </label>

                {err && (
                  <span role="alert" style={{ fontSize: 13, color: '#D64545' }}>
                    {err}
                  </span>
                )}

                <button
                  onClick={confirm}
                  disabled={submitting}
                  className="overlay-submit cursor-pointer self-start border-0 bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover"
                  style={{
                    fontSize: 15,
                    padding: '13px 24px',
                    borderRadius: 10,
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {t.bk_confirm}
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <div
              className="flex h-full flex-col items-center justify-center text-center"
              style={{ gap: 16, padding: 20 }}
            >
              <div
                className="flex items-center justify-center"
                style={{ width: 64, height: 64, borderRadius: '50%', background: '#E6F4EC' }}
              >
                <Check size={32} stroke="#1F8A5B" strokeWidth={2.6} />
              </div>
              <h3 className="m-0 font-bold" style={{ fontSize: 22, letterSpacing: '-0.5px' }}>
                {t.bk_confirmed}
              </h3>
              <p
                className="m-0 text-muted"
                style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 340 }}
              >
                {t.bk_done_a.replace('{min}', String(SCHEDULING.duration))}{' '}
                <strong className="text-ink">
                  {dateLabel} {t.bk_at} {time}
                </strong>
                . {t.bk_done_b} {email}.
              </p>
              {slotSource !== 'api' && (
                <p
                  className="m-0 font-medium"
                  style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 340, color: '#B7791F' }}
                >
                  {t.bk_demo_note}
                </p>
              )}
              <button
                onClick={onClose}
                className="cursor-pointer border-0 bg-ink text-white font-semibold"
                style={{ fontSize: 15, padding: '13px 28px', borderRadius: 10 }}
              >
                {t.bk_done}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

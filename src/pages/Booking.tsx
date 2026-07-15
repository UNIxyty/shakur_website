import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../lang';
import { SCHEDULING } from '../data';
import DatePicker from '../components/DatePicker';
import Dropdown from '../components/Dropdown';
import { Check, Clock, Calendar, ArrowRight } from '../components/icons';
import { rv26 } from '../components/DetailSections';

/**
 * /booking/:token — manage page reached from the confirmation email
 * (not linked from the nav). Summary card in the site's visual language,
 * with reschedule (DatePicker + time Dropdown fed by /api/slots) and a
 * cancel confirmation. `?action=cancel` preselects the cancel step.
 */

type Meeting = {
  name: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  duration_min: number;
  status: 'scheduled' | 'completed' | 'canceled';
};

type View = 'summary' | 'reschedule' | 'cancel';

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const inputBtn: React.CSSProperties = { fontSize: 15, padding: '13px 22px', borderRadius: 10 };

export default function Booking() {
  const { token } = useParams<{ token: string }>();
  const [search] = useSearchParams();
  const { t, lang } = useLang();

  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [view, setView] = useState<View>(search.get('action') === 'cancel' ? 'cancel' : 'summary');
  const [note, setNote] = useState<'' | 'updated' | 'error'>('');
  const [busy, setBusy] = useState(false);

  // Reschedule slot data.
  const [slotMap, setSlotMap] = useState<Record<string, string[]> | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bookings/${token}`);
        if (!res.ok) throw new Error(`booking ${res.status}`);
        const data = (await res.json()) as Meeting;
        if (!cancelled) setMeeting(data);
      } catch {
        if (!cancelled) setMeeting(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Slots are only needed once the reschedule panel opens.
  useEffect(() => {
    if (view !== 'reschedule' || slotMap !== null) return;
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
      } catch {
        if (!cancelled) setSlotMap({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, slotMap]);

  const post = async (path: string, body?: unknown): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!(await post(`/api/bookings/${token}/cancel`))) {
      setNote('error');
      return;
    }
    setMeeting((m) => (m ? { ...m, status: 'canceled' } : m));
    setView('summary');
    setNote('');
  };

  const doReschedule = async () => {
    if (!newDate || !newTime) return;
    if (!(await post(`/api/bookings/${token}/reschedule`, { date: newDate, time: newTime }))) {
      setNote('error');
      return;
    }
    setMeeting((m) => (m ? { ...m, date: newDate, time: newTime } : m));
    setView('summary');
    setNote('updated');
  };

  const statusChip = (status: Meeting['status']) => {
    const map = {
      scheduled: { bg: '#E9EDF7', fg: '#3B5BA5', label: t.mb_status_scheduled },
      canceled: { bg: '#FBE7E7', fg: '#D64545', label: t.mb_status_canceled },
      completed: { bg: '#E6F4EC', fg: '#1F8A5B', label: t.mb_status_completed },
    }[status];
    return (
      <span
        className="inline-flex items-center font-bold uppercase"
        style={{
          gap: 7,
          background: map.bg,
          color: map.fg,
          fontSize: 12,
          letterSpacing: '0.4px',
          padding: '5px 12px',
          borderRadius: 999,
        }}
      >
        {map.label}
      </span>
    );
  };

  // "Wednesday, July 15, 2026" — same shape per language, words localized
  // (LV "Trešdiena, 15. jūlijs 2026" · RU "Среда, 15 июля 2026").
  const dateLabel = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    const wd = t.weekdays_long.split(',')[(d.getDay() + 6) % 7];
    const month = t.months_running.split(',')[d.getMonth()];
    if (lang === 'lv') return `${wd}, ${d.getDate()}. ${month} ${d.getFullYear()}`;
    if (lang === 'ru') return `${wd}, ${d.getDate()} ${month} ${d.getFullYear()}`;
    return `${wd}, ${month} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const factRow = (icon: React.ReactNode, label: string, value: string, first = false) => (
    <div
      className="flex items-center"
      style={{ gap: 12, paddingTop: first ? 0 : 14, borderTop: first ? 'none' : '1px solid #F2F1EF' }}
    >
      <span
        className="flex shrink-0 items-center justify-center bg-peach text-orange"
        style={{ width: 34, height: 34, borderRadius: 9 }}
      >
        {icon}
      </span>
      <div>
        <div className="text-placeholder" style={{ fontSize: 12 }}>
          {label}
        </div>
        <div className="font-semibold" style={{ fontSize: 15 }}>
          {value}
        </div>
      </div>
    </div>
  );

  const times = newDate && slotMap ? (slotMap[newDate] ?? []) : [];

  return (
    <section className="bg-surface-alt" style={{ minHeight: '70vh', padding: '72px 30px 96px' }}>
      <div className="mx-auto" style={{ maxWidth: 560 }}>
        {loading && (
          <p className="m-0 text-center text-placeholder" style={{ fontSize: 15 }}>
            {t.mb_loading}
          </p>
        )}

        {!loading && !meeting && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={rv26}
            className="bg-white text-center"
            style={{
              border: '1px solid #EAEAE8',
              borderRadius: 18,
              padding: 34,
              boxShadow: '0 18px 44px rgba(22,12,0,0.08)',
            }}
          >
            <p className="m-0 text-muted" style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 22 }}>
              {t.mb_not_found}
            </p>
            <Link
              to="/"
              className="inline-flex items-center bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover hover:text-ink"
              style={{ gap: 9, ...inputBtn }}
            >
              {t.nf_home} <ArrowRight size={16} />
            </Link>
          </motion.div>
        )}

        {!loading && meeting && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={rv26}
            className="m-cardpad bg-white"
            style={{
              border: '1px solid #EAEAE8',
              borderRadius: 18,
              padding: 30,
              boxShadow: '0 18px 44px rgba(22,12,0,0.08)',
            }}
          >
            <div
              className="font-semibold uppercase text-placeholder"
              style={{ fontSize: 13, letterSpacing: '0.5px', marginBottom: 6 }}
            >
              {t.mb_eyebrow}
            </div>
            <div className="flex flex-wrap items-center justify-between" style={{ gap: 12, marginBottom: 22 }}>
              <h1
                className="m-0 font-serif font-bold"
                style={{ fontSize: 30, letterSpacing: '-0.6px', lineHeight: 1.08 }}
              >
                {t.mb_title}
              </h1>
              {statusChip(meeting.status)}
            </div>

            {note === 'updated' && (
              <p
                className="m-0 flex items-center font-medium"
                style={{
                  gap: 8,
                  fontSize: 14,
                  color: '#1F8A5B',
                  background: '#E6F4EC',
                  padding: '10px 14px',
                  borderRadius: 10,
                  marginBottom: 18,
                }}
              >
                <Check size={16} stroke="#1F8A5B" strokeWidth={2.6} />
                {t.mb_updated}
              </p>
            )}
            {note === 'error' && (
              <p
                className="m-0 font-medium"
                style={{
                  fontSize: 14,
                  color: '#D64545',
                  background: '#FBE7E7',
                  padding: '10px 14px',
                  borderRadius: 10,
                  marginBottom: 18,
                }}
              >
                {t.mb_err}
              </p>
            )}

            <div className="flex flex-col" style={{ gap: 14, marginBottom: 24 }}>
              {factRow(
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>,
                t.mb_f_name,
                meeting.name,
                true
              )}
              {factRow(<Calendar size={17} stroke="currentColor" />, t.mb_f_date, dateLabel(meeting.date))}
              {factRow(<Clock size={17} stroke="currentColor" />, t.mb_f_time, meeting.time)}
              {factRow(
                <Clock size={17} stroke="currentColor" />,
                t.mb_f_duration,
                `${meeting.duration_min} ${t.mb_minutes}`
              )}
            </div>

            {meeting.status === 'canceled' && (
              <p className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                {t.mb_canceled_msg}
              </p>
            )}
            {meeting.status === 'completed' && (
              <p className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                {t.mb_completed_msg}
              </p>
            )}

            {meeting.status === 'scheduled' && view === 'summary' && (
              <div className="flex flex-wrap" style={{ gap: 12 }}>
                <button
                  onClick={() => {
                    setView('reschedule');
                    setNote('');
                  }}
                  className="cursor-pointer border-0 bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover"
                  style={inputBtn}
                >
                  {t.mb_reschedule}
                </button>
                <button
                  onClick={() => {
                    setView('cancel');
                    setNote('');
                  }}
                  className="cursor-pointer bg-white font-semibold transition-colors"
                  style={{ ...inputBtn, border: '1.5px solid #D64545', color: '#D64545' }}
                >
                  {t.mb_cancel}
                </button>
              </div>
            )}

            {meeting.status === 'scheduled' && view === 'reschedule' && (
              <div
                className="flex flex-col"
                style={{ gap: 14, borderTop: '1px solid #F2F1EF', paddingTop: 20 }}
              >
                <label className="flex flex-col font-semibold" style={{ gap: 7, fontSize: 13 }}>
                  {t.mb_new_date}
                  <DatePicker
                    value={newDate}
                    onChange={(iso) => {
                      setNewDate(iso);
                      setNewTime('');
                    }}
                    placeholder={t.mb_date_ph}
                    isDateDisabled={(iso) => !slotMap || !(slotMap[iso]?.length)}
                  />
                </label>
                <label className="flex flex-col font-semibold" style={{ gap: 7, fontSize: 13 }}>
                  {t.mb_new_time}
                  <Dropdown
                    value={newTime}
                    options={times}
                    placeholder={t.mb_time_ph}
                    onChange={setNewTime}
                    disabled={!newDate || times.length === 0}
                    ariaLabel={t.mb_new_time}
                  />
                </label>
                {newDate && slotMap && times.length === 0 && (
                  <span className="text-placeholder" style={{ fontSize: 13 }}>
                    {t.bk_no_times}
                  </span>
                )}
                <div className="flex flex-wrap" style={{ gap: 12, marginTop: 4 }}>
                  <button
                    onClick={doReschedule}
                    disabled={busy || !newDate || !newTime}
                    className="cursor-pointer border-0 bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover"
                    style={{ ...inputBtn, opacity: busy || !newDate || !newTime ? 0.55 : 1 }}
                  >
                    {t.mb_confirm_res}
                  </button>
                  <button
                    onClick={() => setView('summary')}
                    className="cursor-pointer bg-white font-semibold text-muted transition-colors"
                    style={{ ...inputBtn, border: '1px solid #E7E5E4' }}
                  >
                    {t.bk_back}
                  </button>
                </div>
              </div>
            )}

            {meeting.status === 'scheduled' && view === 'cancel' && (
              <div
                className="flex flex-col"
                style={{ gap: 12, borderTop: '1px solid #F2F1EF', paddingTop: 20 }}
              >
                <div className="font-bold" style={{ fontSize: 16 }}>
                  {t.mb_cancel_q}
                </div>
                <p className="m-0 text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  {t.mb_cancel_note}
                </p>
                <div className="flex flex-wrap" style={{ gap: 12, marginTop: 4 }}>
                  <button
                    onClick={doCancel}
                    disabled={busy}
                    className="cursor-pointer border-0 font-semibold text-white transition-colors"
                    style={{ ...inputBtn, background: '#D64545', opacity: busy ? 0.55 : 1 }}
                  >
                    {t.mb_confirm_cancel}
                  </button>
                  <button
                    onClick={() => setView('summary')}
                    className="cursor-pointer bg-white font-semibold text-muted transition-colors"
                    style={{ ...inputBtn, border: '1px solid #E7E5E4' }}
                  >
                    {t.mb_keep}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}

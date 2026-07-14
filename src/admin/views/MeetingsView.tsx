import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MeetingRow } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import Dropdown from '../../components/Dropdown';
import DatePicker from '../../components/DatePicker';
import { useAdminShell } from '../components/context';
import { ListEmpty, ListError } from '../components/RecordCards';
import {
  FONT,
  Field,
  IconBtn,
  IconCalendar,
  IconClose,
  IconEye,
  IconRetry,
  avatarColors,
  fmtDate,
  initials,
  meetingBadge,
} from '../components/ui';

/**
 * Meetings view from ShakurAdminPanel.dc.html — Upcoming/Past/Canceled tabs
 * (status drives the tab), attendee search via the shell search box, refresh,
 * table rows, and the detail modal with cancel/reschedule through the admin
 * API (direct Supabase fallback when the API is unreachable).
 */

type TabKey = 'upcoming' | 'past' | 'canceled';

const TAB_STATUS: Record<TabKey, MeetingRow['status']> = {
  upcoming: 'scheduled',
  past: 'completed',
  canceled: 'canceled',
};

const EMPTY_COPY: Record<TabKey, [string, string]> = {
  upcoming: ['No upcoming meetings', 'New bookings from the site will appear here.'],
  past: ['No past meetings', 'Completed meetings will be listed here.'],
  canceled: ['No canceled meetings', 'Canceled bookings show up here.'],
};

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 21; h++) {
  for (const mm of ['00', '30']) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${mm}`);
}

const GRID_COLS = '2fr 1.4fr 96px 130px 120px';

/** POST to the admin meetings API with the Supabase bearer token. */
async function meetingApi(id: string, action: 'cancel' | 'reschedule', body: object): Promise<boolean> {
  try {
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;
    const res = await fetch(`/api/admin/meetings/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function MeetingsView() {
  const { toast, confirm, search, setSubtitle, refreshUpcoming } = useAdminShell();
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [refreshTick, setRefreshTick] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [resched, setResched] = useState<{ date: string; time: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (minMs = 0) => {
    if (!supabase) return;
    setLoading(true);
    setError(false);
    const started = Date.now();
    const { data, error: err } = await supabase
      .from('meetings')
      .select('*')
      .order('meeting_date', { ascending: true })
      .order('meeting_time', { ascending: true });
    const wait = Math.max(0, minMs - (Date.now() - started));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    if (err) setError(true);
    else setMeetings((data ?? []) as MeetingRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      upcoming: meetings.filter((m) => m.status === 'scheduled').length,
      past: meetings.filter((m) => m.status === 'completed').length,
      canceled: meetings.filter((m) => m.status === 'canceled').length,
    }),
    [meetings]
  );

  useEffect(() => {
    setSubtitle(`${counts.upcoming} upcoming · ${meetings.length} total`);
    return () => setSubtitle(null);
  }, [counts.upcoming, meetings.length, setSubtitle]);

  const q = search.trim().toLowerCase();
  const list = useMemo(() => {
    let ml = meetings.filter((m) => m.status === TAB_STATUS[tab]);
    if (q) ml = ml.filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(q));
    // Upcoming reads soonest-first; history reads newest-first.
    if (tab !== 'upcoming') ml = [...ml].reverse();
    return ml;
  }, [meetings, tab, q]);

  const refresh = () => {
    setRefreshTick((t) => t + 1);
    void load(900).then(refreshUpcoming);
  };

  const cancelMeeting = async (m: MeetingRow) => {
    const ok = await confirm({
      title: 'Cancel this meeting?',
      message: 'The attendee will be notified by email that their booking has been canceled.',
      label: 'Cancel it',
    });
    if (!ok) return;
    setBusy(true);
    const apiOk = await meetingApi(m.id, 'cancel', {});
    if (!apiOk && supabase) {
      const { error: err } = await supabase
        .from('meetings')
        .update({ status: 'canceled' })
        .eq('id', m.id);
      setBusy(false);
      if (err) {
        toast("Couldn't cancel the meeting");
        return;
      }
      toast('Meeting canceled — email not sent');
    } else {
      setBusy(false);
      toast('Meeting canceled');
    }
    setDetailId(null);
    setResched(null);
    await load();
    refreshUpcoming();
  };

  const rescheduleMeeting = async (m: MeetingRow, date: string, time: string) => {
    if (!date || !time) return;
    setBusy(true);
    const apiOk = await meetingApi(m.id, 'reschedule', { date, time });
    if (!apiOk && supabase) {
      const { error: err } = await supabase
        .from('meetings')
        .update({ meeting_date: date, meeting_time: time, status: 'scheduled' })
        .eq('id', m.id);
      setBusy(false);
      if (err) {
        toast("Couldn't reschedule the meeting");
        return;
      }
      toast('Meeting rescheduled — email not sent');
    } else {
      setBusy(false);
      toast('Meeting rescheduled');
    }
    setDetailId(null);
    setResched(null);
    await load();
    refreshUpcoming();
  };

  const detail = meetings.find((m) => m.id === detailId) ?? null;

  const tabBtn = (key: TabKey, label: string) => {
    const active = tab === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setTab(key)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          border: 'none',
          cursor: 'pointer',
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 14,
          padding: '8px 15px',
          borderRadius: 8,
          background: active ? '#FFFFFF' : 'transparent',
          color: active ? '#160C00' : '#54504D',
        }}
      >
        {label}
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            background: active ? '#FFF3E4' : '#E7E5E4',
            color: active ? '#B7791F' : '#54504D',
            borderRadius: 999,
            padding: '1px 7px',
          }}
        >
          {counts[key]}
        </span>
      </button>
    );
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', gap: 4, background: '#F2F1EF', padding: 4, borderRadius: 11 }}>
          {tabBtn('upcoming', 'Upcoming')}
          {tabBtn('past', 'Past')}
          {tabBtn('canceled', 'Canceled')}
        </div>
        <button
          type="button"
          onClick={refresh}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid #E7E5E4',
            cursor: 'pointer',
            background: '#fff',
            color: '#54504D',
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 14,
            padding: '10px 15px',
            borderRadius: 10,
          }}
        >
          <span
            style={{
              display: 'flex',
              transform: `rotate(${refreshTick * 360}deg)`,
              transition: 'transform .9s ease',
            }}
          >
            <IconRetry size={16} strokeWidth={2} />
          </span>
          Refresh
        </button>
      </div>

      {loading && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #EAEAE8',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '18px 24px',
                borderBottom: '1px solid #F2F1EF',
              }}
            >
              <div className="adm-skel" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div className="adm-skel" style={{ width: '40%', height: 13 }} />
                <div className="adm-skel" style={{ width: '55%', height: 11 }} />
              </div>
              <div className="adm-skel" style={{ width: 120, height: 13 }} />
              <div className="adm-skel" style={{ width: 90, height: 24, borderRadius: 999 }} />
            </div>
          ))}
        </div>
      )}

      {!loading && error && <ListError noun="meetings" onRetry={() => void load()} />}

      {!loading && !error && list.length === 0 && (
        <ListEmpty
          icon={<IconCalendar />}
          title={EMPTY_COPY[tab][0]}
          sub={EMPTY_COPY[tab][1]}
        />
      )}

      {!loading && !error && list.length > 0 && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #EAEAE8',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div className="adm-scroll" style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 860 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLS,
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 24px',
                  background: '#FAFAF9',
                  borderBottom: '1px solid #EAEAE8',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  color: '#A8A29E',
                }}
              >
                <span>Attendee</span>
                <span>Date &amp; time</span>
                <span>Length</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Actions</span>
              </div>
              {list.map((m) => {
                const [bg, color, label] = meetingBadge(m.status);
                const [avBg, avColor] = avatarColors(m.name);
                return (
                  <div
                    key={m.id}
                    onClick={() => setDetailId(m.id)}
                    className="adm-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: GRID_COLS,
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 24px',
                      borderBottom: '1px solid #F2F1EF',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: avBg,
                          color: avColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initials(m.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.name}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: '#A8A29E',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.email}
                        </div>
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtDate(m.meeting_date)}</div>
                      <div style={{ fontSize: 13, color: '#A8A29E' }}>{m.meeting_time}</div>
                    </div>
                    <span style={{ fontSize: 14, color: '#54504D' }}>{m.duration_min} min</span>
                    <span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          padding: '5px 11px',
                          borderRadius: 999,
                          background: bg,
                          color,
                        }}
                      >
                        <span
                          style={{ width: 7, height: 7, borderRadius: '50%', background: color }}
                        />
                        {label}
                      </span>
                    </span>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <IconBtn
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailId(m.id);
                        }}
                        label="View"
                        size={34}
                      >
                        <IconEye />
                      </IconBtn>
                      {m.status === 'scheduled' && (
                        <IconBtn
                          onClick={(e) => {
                            e.stopPropagation();
                            void cancelMeeting(m);
                          }}
                          label="Cancel"
                          danger
                          size={34}
                        >
                          <IconClose size={16} />
                        </IconBtn>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* detail modal */}
      <AnimatePresence>
        {detail && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 210,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setDetailId(null);
                setResched(null);
              }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(22,12,0,0.45)' }}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'relative',
                width: 460,
                maxWidth: '100%',
                background: '#FFFFFF',
                borderRadius: 18,
                overflow: 'hidden',
                boxShadow: '0 30px 70px rgba(0,0,0,0.28)',
              }}
            >
              {(() => {
                const [bg, color, label] = meetingBadge(detail.status);
                const [avBg, avColor] = avatarColors(detail.name);
                return (
                  <>
                    <div
                      style={{
                        padding: '24px 26px',
                        borderBottom: '1px solid #EAEAE8',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: '50%',
                          background: avBg,
                          color: avColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initials(detail.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2
                          style={{
                            margin: '0 0 3px',
                            fontSize: 19,
                            fontWeight: 700,
                            letterSpacing: -0.3,
                          }}
                        >
                          {detail.name}
                        </h2>
                        <a
                          href={`mailto:${detail.email}`}
                          style={{ fontSize: 14, color: '#FB8500', textDecoration: 'none' }}
                        >
                          {detail.email}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailId(null);
                          setResched(null);
                        }}
                        aria-label="Close"
                        style={{
                          width: 32,
                          height: 32,
                          border: 'none',
                          background: '#F5F5F4',
                          borderRadius: 8,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#54504D',
                          flexShrink: 0,
                        }}
                      >
                        <IconClose size={17} />
                      </button>
                    </div>
                    <div
                      style={{
                        padding: '22px 26px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 24 }}>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: 0.4,
                              color: '#A8A29E',
                              marginBottom: 4,
                            }}
                          >
                            Date &amp; time
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>
                            {fmtDate(detail.meeting_date)}
                          </div>
                          <div style={{ fontSize: 14, color: '#54504D' }}>
                            {detail.meeting_time} · {detail.duration_min} min
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: 0.4,
                              color: '#A8A29E',
                              marginBottom: 4,
                            }}
                          >
                            Status
                          </div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              padding: '5px 11px',
                              borderRadius: 999,
                              background: bg,
                              color,
                            }}
                          >
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: color,
                              }}
                            />
                            {label}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 0.4,
                            color: '#A8A29E',
                            marginBottom: 6,
                          }}
                        >
                          Notes
                        </div>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#54504D' }}>
                          {detail.notes || 'No notes.'}
                        </p>
                      </div>
                      {resched && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-end',
                            paddingTop: 4,
                          }}
                        >
                          <Field label="New date" style={{ flex: 1.2 }}>
                            <DatePicker
                              value={resched.date}
                              placeholder="Pick a date"
                              onChange={(v) => setResched((r) => (r ? { ...r, date: v } : r))}
                            />
                          </Field>
                          <Field label="Time" style={{ flex: 1 }}>
                            <Dropdown
                              value={resched.time}
                              options={TIME_OPTIONS}
                              onChange={(v) => setResched((r) => (r ? { ...r, time: v } : r))}
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                    {detail.status === 'scheduled' && (
                      <div
                        style={{
                          display: 'flex',
                          gap: 12,
                          padding: '18px 26px',
                          borderTop: '1px solid #EAEAE8',
                        }}
                      >
                        {resched ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setResched(null)}
                              style={{
                                flex: 1,
                                cursor: 'pointer',
                                background: '#fff',
                                color: '#160C00',
                                border: '1.5px solid #E7E5E4',
                                fontFamily: FONT,
                                fontWeight: 600,
                                fontSize: 14,
                                padding: 12,
                                borderRadius: 10,
                              }}
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              disabled={busy || !resched.date || !resched.time}
                              onClick={() =>
                                void rescheduleMeeting(detail, resched.date, resched.time)
                              }
                              style={{
                                flex: 1,
                                cursor: busy ? 'default' : 'pointer',
                                background: '#160C00',
                                color: '#fff',
                                border: 'none',
                                fontFamily: FONT,
                                fontWeight: 600,
                                fontSize: 14,
                                padding: 12,
                                borderRadius: 10,
                                opacity: busy || !resched.date || !resched.time ? 0.6 : 1,
                              }}
                            >
                              {busy ? 'Saving…' : 'Confirm reschedule'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void cancelMeeting(detail)}
                              style={{
                                flex: 1,
                                cursor: 'pointer',
                                background: '#fff',
                                color: '#D64545',
                                border: '1.5px solid #F3D6D6',
                                fontFamily: FONT,
                                fontWeight: 600,
                                fontSize: 14,
                                padding: 12,
                                borderRadius: 10,
                              }}
                            >
                              Cancel meeting
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setResched({
                                  date: detail.meeting_date,
                                  time: detail.meeting_time,
                                })
                              }
                              style={{
                                flex: 1,
                                cursor: 'pointer',
                                background: '#160C00',
                                color: '#fff',
                                border: 'none',
                                fontFamily: FONT,
                                fontWeight: 600,
                                fontSize: 14,
                                padding: 12,
                                borderRadius: 10,
                              }}
                            >
                              Reschedule
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

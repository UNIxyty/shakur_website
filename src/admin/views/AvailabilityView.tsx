import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Availability } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import Dropdown from '../../components/Dropdown';
import DatePicker from '../../components/DatePicker';
import { useAdminShell } from '../components/context';
import { ListError } from '../components/RecordCards';
import { Field, IconBtn, IconEdit, IconTrash, MONTHS, PrimaryBtn, Toggle, WEEKDAYS, fmtDate } from '../components/ui';

/**
 * Availability view from ShakurAdminPanel.dc.html: booking rules, block-out
 * dates, weekly hours (Monday→Sunday), and the generated open-slot preview.
 * Persists the single availability row (id = 1) on Save.
 */

type DayKey = keyof Availability['week'];
const DAYS: DayKey[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DURATION_OPTIONS = ['15 minutes', '30 minutes', '45 minutes', '60 minutes', '90 minutes'];
const BUFFER_OPTIONS = ['No buffer', '5 minutes', '10 minutes', '15 minutes', '30 minutes'];
const TZ_OPTIONS = ['(GMT+2) Rīga', '(GMT+1) Stockholm', '(GMT+0) London', '(GMT+3) Moscow'];
const TZ_MAP: Record<string, string> = {
  '(GMT+2) Rīga': 'Europe/Riga',
  '(GMT+1) Stockholm': 'Europe/Stockholm',
  '(GMT+0) London': 'Europe/London',
  '(GMT+3) Moscow': 'Europe/Moscow',
};

const minutesToLabel = (n: number) => (n === 0 ? 'No buffer' : `${n} minutes`);
const labelToMinutes = (s: string) => (s === 'No buffer' ? 0 : parseInt(s, 10) || 0);
const tzToLabel = (iana: string) =>
  Object.keys(TZ_MAP).find((k) => TZ_MAP[k] === iana) ?? '(GMT+2) Rīga';

/** 06:00–21:30 half-hour options (design timeOptions loop). */
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 21; h++) {
  for (const mm of ['00', '30']) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${mm}`);
}

const DEFAULT_AVAILABILITY: Availability = {
  week: {
    Monday: { on: true, start: '09:00', end: '17:00' },
    Tuesday: { on: true, start: '09:00', end: '17:00' },
    Wednesday: { on: true, start: '09:00', end: '17:00' },
    Thursday: { on: true, start: '09:00', end: '17:00' },
    Friday: { on: true, start: '09:00', end: '15:00' },
    Saturday: { on: false, start: '10:00', end: '14:00' },
    Sunday: { on: false, start: '10:00', end: '14:00' },
  },
  slot_minutes: 30,
  buffer_minutes: 10,
  timezone: 'Europe/Riga',
  blockouts: [],
};

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #EAEAE8',
  borderRadius: 16,
  padding: 24,
};

export default function AvailabilityView() {
  const { toast, setSubtitle } = useAdminShell();
  const [av, setAv] = useState<Availability>(DEFAULT_AVAILABILITY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blockoutDraft, setBlockoutDraft] = useState('');

  useEffect(() => {
    setSubtitle('Define when meetings can be booked');
    return () => setSubtitle(null);
  }, [setSubtitle]);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from('availability')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (err) setError(true);
    else if (data) {
      setAv({
        week: data.week as Availability['week'],
        slot_minutes: data.slot_minutes as number,
        buffer_minutes: data.buffer_minutes as number,
        timezone: data.timezone as string,
        blockouts: (data.blockouts ?? []) as string[],
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!supabase || saving) return;
    setSaving(true);
    const { error: err } = await supabase.from('availability').upsert({ id: 1, ...av });
    setSaving(false);
    if (err) toast("Couldn't save availability");
    else toast('Availability saved');
  };

  const patchDay = (day: DayKey, patch: Partial<Availability['week'][DayKey]>) =>
    setAv((a) => ({ ...a, week: { ...a.week, [day]: { ...a.week[day], ...patch } } }));

  const addBlockout = () => {
    if (blockoutDraft && !av.blockouts.includes(blockoutDraft)) {
      setAv((a) => ({ ...a, blockouts: [...a.blockouts, blockoutDraft].sort() }));
      setBlockoutDraft('');
      toast('Block-out date added');
    }
  };

  /** Open-slot preview for the next days (design _genSlots, from today). */
  const openSlots = useMemo(() => {
    const out: { iso: string; dayNum: number; mon: string; time: string; weekday: string }[] = [];
    let d = new Date();
    let guard = 0;
    while (out.length < 5 && guard < 30) {
      guard++;
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const dayName = WEEKDAYS[d.getDay()] as DayKey;
      const w = av.week[dayName];
      if (w && w.on && !av.blockouts.includes(iso)) {
        out.push({
          iso,
          dayNum: d.getDate(),
          mon: MONTHS[d.getMonth()],
          time: `${w.start} – ${w.end}`,
          weekday: dayName,
        });
      }
    }
    return out;
  }, [av]);

  if (error) return <ListError noun="availability" onRetry={() => void load()} />;
  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 22, maxWidth: 1180 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={card}>
            <div className="adm-skel" style={{ width: '30%', height: 16, marginBottom: 12 }} />
            <div className="adm-skel" style={{ width: '100%', height: 46, marginBottom: 8 }} />
            <div className="adm-skel" style={{ width: '100%', height: 46 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 22, maxWidth: 1180 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 22,
        }}
      >
        {/* Booking rules */}
        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>Booking rules</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#A8A29E' }}>
            Defaults applied to every open slot.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Meeting duration">
              <Dropdown
                value={minutesToLabel(av.slot_minutes)}
                options={DURATION_OPTIONS}
                onChange={(v) => setAv((a) => ({ ...a, slot_minutes: labelToMinutes(v) }))}
              />
            </Field>
            <Field label="Buffer between meetings">
              <Dropdown
                value={minutesToLabel(av.buffer_minutes)}
                options={BUFFER_OPTIONS}
                onChange={(v) => setAv((a) => ({ ...a, buffer_minutes: labelToMinutes(v) }))}
              />
            </Field>
            <Field label="Timezone">
              <Dropdown
                value={tzToLabel(av.timezone)}
                options={TZ_OPTIONS}
                onChange={(v) => setAv((a) => ({ ...a, timezone: TZ_MAP[v] ?? 'Europe/Riga' }))}
              />
            </Field>
          </div>
        </div>

        {/* Block-out dates */}
        <div style={card}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>Block-out dates</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#A8A29E' }}>
            Days with no bookable slots.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <DatePicker value={blockoutDraft} placeholder="Pick a date" onChange={setBlockoutDraft} />
            </div>
            <button
              type="button"
              onClick={addBlockout}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: '#160C00',
                color: '#fff',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                padding: '12px 16px',
                borderRadius: 10,
                whiteSpace: 'nowrap',
              }}
            >
              Block
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {av.blockouts.map((b) => (
              <span
                key={b}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#FBE7E7',
                  color: '#D64545',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '6px 8px 6px 12px',
                  borderRadius: 999,
                }}
              >
                {fmtDate(b)}
                <button
                  type="button"
                  onClick={() =>
                    setAv((a) => ({ ...a, blockouts: a.blockouts.filter((x) => x !== b) }))
                  }
                  aria-label="Remove"
                  style={{
                    border: 'none',
                    background: 'rgba(214,69,69,0.16)',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    color: '#D64545',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            {av.blockouts.length === 0 && (
              <span style={{ fontSize: 13, color: '#A8A29E' }}>No block-out dates.</span>
            )}
          </div>
        </div>
      </div>

      {/* Weekly hours */}
      <div style={card}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>Weekly availability</h3>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#A8A29E' }}>
          Recurring hours meetings can be booked into.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {DAYS.map((day) => {
            const w = av.week[day];
            return (
              <div
                key={day}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '130px 1fr',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 0',
                  borderTop: '1px solid #F2F1EF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Toggle
                    on={w.on}
                    onToggle={() => patchDay(day, { on: !w.on })}
                    width={42}
                    height={24}
                    travel={18}
                    ariaLabel={`${day} availability`}
                  />
                  <span
                    style={{ fontSize: 14, fontWeight: 600, color: w.on ? '#160C00' : '#A8A29E' }}
                  >
                    {day}
                  </span>
                </div>
                {w.on ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ width: 118 }}>
                      <Dropdown
                        size="sm"
                        value={w.start}
                        options={TIME_OPTIONS}
                        onChange={(v) => patchDay(day, { start: v })}
                      />
                    </div>
                    <span style={{ color: '#A8A29E', fontSize: 14 }}>to</span>
                    <div style={{ width: 118 }}>
                      <Dropdown
                        size="sm"
                        value={w.end}
                        options={TIME_OPTIONS}
                        onChange={(v) => patchDay(day, { end: v })}
                      />
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 14, color: '#A8A29E' }}>Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming open slots */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 700 }}>
              Upcoming open slots
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#A8A29E' }}>
              Generated from your weekly rules.
            </p>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#FB8500',
              background: '#FFF3E4',
              padding: '5px 12px',
              borderRadius: 999,
            }}
          >
            {openSlots.length} open
          </span>
        </div>
        {openSlots.map((s) => (
          <div
            key={s.iso}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 24px',
              borderTop: '1px solid #F2F1EF',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#FFF3E4',
                color: '#B7791F',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{s.dayNum}</span>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                {s.mon}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{s.time}</div>
              <div style={{ fontSize: 13, color: '#A8A29E' }}>
                {s.weekday} · {minutesToLabel(av.slot_minutes)}
              </div>
            </div>
            <IconBtn onClick={() => toast('Edit slot (demo)')} label="Edit" size={34}>
              <IconEdit size={16} />
            </IconBtn>
            <IconBtn onClick={() => toast('Slot removed')} label="Delete" danger size={34}>
              <IconTrash size={16} />
            </IconBtn>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PrimaryBtn onClick={() => void save()} disabled={saving} style={{ padding: '12px 22px' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </PrimaryBtn>
      </div>
    </div>
  );
}

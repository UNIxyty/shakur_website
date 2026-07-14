import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Calendar date picker ported from DatePicker.dc.html — Dropdown-style trigger
 * with a calendar icon, 268px popover, Monday-first grid, orange selected day.
 * Values are the literal ones from the design source. Value is ISO 'YYYY-MM-DD';
 * the trigger label renders as '15 Jul 2026'.
 */

export type DatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Inclusive ISO bounds — days outside are disabled (booking lead time / horizon). */
  min?: string;
  max?: string;
  /** Explicit ISO dates to disable (blockouts). */
  disabledDates?: string[];
  isDateDisabled?: (iso: string) => boolean;
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** CSS `ease` — the design animates the popover with `dpIn .15s ease`. */
const EASE_CSS: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const parseIso = (s: string | undefined): Date | null => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
};

const toIso = (y: number, mo: number, d: number) =>
  `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const CalendarSvg = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ArrowSvg = ({ dir }: { dir: 'prev' | 'next' }) => (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points={dir === 'prev' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
  </svg>
);

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  min,
  max,
  disabledDates,
  isDateDisabled,
}: DatePickerProps) {
  const initial = parseIso(value) || new Date();
  const [open, setOpen] = useState(false);
  const [vy, setVy] = useState(initial.getFullYear());
  const [vm, setVm] = useState(initial.getMonth());
  const rootRef = useRef<HTMLDivElement>(null);

  // Outside click closes (mousedown, like the design source).
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const openCal = () => {
    const d = parseIso(value) || new Date();
    setVy(d.getFullYear());
    setVm(d.getMonth());
    setOpen(true);
  };

  const pick = (iso: string) => {
    setOpen(false);
    onChange(iso);
  };

  const prevMonth = () => {
    if (vm - 1 < 0) {
      setVy(vy - 1);
      setVm(11);
    } else {
      setVm(vm - 1);
    }
  };
  const nextMonth = () => {
    if (vm + 1 > 11) {
      setVy(vy + 1);
      setVm(0);
    } else {
      setVm(vm + 1);
    }
  };

  const disabled = (iso: string) =>
    (min !== undefined && iso < min) ||
    (max !== undefined && iso > max) ||
    (disabledDates?.includes(iso) ?? false) ||
    (isDateDisabled?.(iso) ?? false);

  const sel = parseIso(value);
  const today = new Date();
  const first = new Date(vy, vm, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const daysIn = new Date(vy, vm + 1, 0).getDate();

  const fmt = sel
    ? `${sel.getDate()} ${MONTHS[sel.getMonth()].slice(0, 3)} ${sel.getFullYear()}`
    : null;

  const cells: { day: number; iso: string }[] = [];
  for (let d = 1; d <= daysIn; d++) cells.push({ day: d, iso: toIso(vy, vm, d) });

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openCal())}
        className="flex w-full cursor-pointer items-center justify-between bg-white text-left font-medium outline-none"
        style={{
          gap: 10,
          border: `1px solid ${open ? '#FB8500' : '#E7E5E4'}`,
          borderRadius: 10,
          padding: '11px 13px',
          fontSize: 15,
          color: fmt ? '#160C00' : '#A8A29E',
          boxShadow: open ? '0 0 0 3px rgba(251,133,0,0.15)' : 'none',
          transition: 'border-color .15s ease, box-shadow .15s ease',
        }}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {fmt || placeholder}
        </span>
        <span className="flex shrink-0" style={{ color: '#A8A29E' }}>
          <CalendarSvg />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Choose date"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.1, ease: EASE_CSS } }}
            transition={{ duration: 0.15, ease: EASE_CSS }}
            className="absolute left-0 bg-white"
            style={{
              top: 'calc(100% + 6px)',
              zIndex: 90,
              width: 268,
              border: '1px solid #E7E5E4',
              borderRadius: 14,
              boxShadow: '0 16px 40px rgba(22,12,0,0.18)',
              padding: 14,
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous month"
                className="flex cursor-pointer items-center justify-center border border-solid border-border-input bg-white text-muted hover:border-orange hover:text-orange"
                style={{ width: 30, height: 30, borderRadius: 8 }}
              >
                <ArrowSvg dir="prev" />
              </button>
              <span className="font-bold" style={{ fontSize: 14, color: '#160C00' }}>
                {MONTHS[vm]} {vy}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="flex cursor-pointer items-center justify-center border border-solid border-border-input bg-white text-muted hover:border-orange hover:text-orange"
                style={{ width: 30, height: 30, borderRadius: 8 }}
              >
                <ArrowSvg dir="next" />
              </button>
            </div>

            <div
              className="grid"
              style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}
            >
              {DOW.map((d) => (
                <span
                  key={d}
                  className="text-center font-semibold"
                  style={{ fontSize: 11, color: '#A8A29E', padding: '4px 0' }}
                >
                  {d}
                </span>
              ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {Array.from({ length: startDow }, (_, i) => (
                <span key={`b${i}`} />
              ))}
              {cells.map((c) => {
                const isSel =
                  sel !== null &&
                  sel.getFullYear() === vy &&
                  sel.getMonth() === vm &&
                  sel.getDate() === c.day;
                const isToday =
                  today.getFullYear() === vy &&
                  today.getMonth() === vm &&
                  today.getDate() === c.day;
                const isOff = disabled(c.iso);
                return (
                  <button
                    key={c.iso}
                    type="button"
                    disabled={isOff}
                    aria-label={c.iso}
                    onClick={() => pick(c.iso)}
                    className={
                      isOff
                        ? 'aspect-square border-0 bg-transparent'
                        : isSel
                          ? 'aspect-square cursor-pointer border-0 bg-orange hover:bg-orange-hover'
                          : isToday
                            ? 'aspect-square cursor-pointer border-0 bg-peach hover:bg-surface'
                            : 'aspect-square cursor-pointer border-0 bg-transparent hover:bg-surface'
                    }
                    style={{
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: isSel || isToday ? 700 : 500,
                      color: isOff ? '#D6D3D1' : '#160C00',
                      cursor: isOff ? 'default' : 'pointer',
                    }}
                  >
                    {c.day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DatePicker;

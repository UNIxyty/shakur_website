import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Custom select ported from Dropdown.dc.html — trigger, chevron rotation,
 * floating option panel, orange selected state. Values are the literal ones
 * from the design source.
 */

type Option = { value: string; label: string };

export type DropdownProps = {
  value: string;
  options: string[] | Option[];
  placeholder?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  /** Compact variant for admin time selects — same look, padding 8px 11px, 14px font. */
  size?: 'sm';
};

/** CSS `ease` — the design animates the panel with `ddIn .15s ease`. */
const EASE_CSS: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const ChevronSvg = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CheckSvg = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function Dropdown({
  value,
  options,
  placeholder = 'Select…',
  onChange,
  disabled = false,
  ariaLabel,
  size,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  /** Index of the hovered / keyboard-highlighted option; -1 = none. */
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const opts = useMemo<Option[]>(
    () =>
      (options as (string | Option)[]).map((o) =>
        typeof o === 'string' ? { value: o, label: o } : o
      ),
    [options]
  );

  const selectedIdx = opts.findIndex((o) => o.value === value);
  const hasValue = value !== '';
  const label = hasValue ? (opts[selectedIdx]?.label ?? value) : placeholder;

  // Outside click closes (mousedown, like the design source).
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Esc closes even when focus moved into the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Keep the keyboard-highlighted option in view inside the 264px scroll area.
  useEffect(() => {
    if (!open || highlight < 0) return;
    menuRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight]);

  const openMenu = () => {
    setHighlight(-1);
    setOpen(true);
  };

  const pick = (v: string) => {
    setOpen(false);
    onChange(v);
  };

  const move = (dir: 1 | -1) => {
    setHighlight((h) => {
      if (h === -1) return selectedIdx >= 0 ? selectedIdx : dir === 1 ? 0 : opts.length - 1;
      return Math.min(opts.length - 1, Math.max(0, h + dir));
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const o = highlight >= 0 ? opts[highlight] : undefined;
      if (o) pick(o.value);
      else setOpen(false);
    }
  };

  const sm = size === 'sm';

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        // dd-trigger: ≥48px touch control on phones (index.css); admin `sm` opts out.
        className={`dd-trigger ${sm ? 'dd-sm ' : ''}flex w-full cursor-pointer items-center justify-between bg-white text-left font-medium outline-none`}
        style={{
          gap: 10,
          border: `1px solid ${open ? '#FB8500' : '#E7E5E4'}`,
          borderRadius: 10,
          padding: sm ? '8px 11px' : '11px 13px',
          fontSize: sm ? 14 : 15,
          color: hasValue ? '#160C00' : '#A8A29E',
          boxShadow: open ? '0 0 0 3px rgba(251,133,0,0.15)' : 'none',
          transition: 'border-color .15s ease, box-shadow .15s ease',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
        <span
          className="flex shrink-0"
          style={{
            transform: `rotate(${open ? 180 : 0}deg)`,
            transition: 'transform .18s ease',
            color: '#A8A29E',
          }}
        >
          <ChevronSvg />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.1, ease: EASE_CSS } }}
            transition={{ duration: 0.15, ease: EASE_CSS }}
            onMouseLeave={() => setHighlight(-1)}
            className="absolute left-0 right-0 overflow-y-auto bg-white"
            style={{
              top: 'calc(100% + 6px)',
              zIndex: 80,
              border: '1px solid #E7E5E4',
              borderRadius: 12,
              boxShadow: '0 14px 36px rgba(22,12,0,0.16)',
              padding: 6,
              maxHeight: 264,
            }}
          >
            {opts.map((o, i) => {
              const isSel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(o.value)}
                  className="flex w-full cursor-pointer items-center justify-between border-0 text-left"
                  style={{
                    gap: 8,
                    background: i === highlight ? '#F5F5F4' : isSel ? '#FFF3E4' : 'transparent',
                    borderRadius: 8,
                    padding: '10px 11px',
                    fontSize: 14,
                    fontWeight: isSel ? 600 : 500,
                    color: '#160C00',
                  }}
                >
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{o.label}</span>
                  {isSel && (
                    <span className="flex shrink-0" style={{ color: '#FB8500' }}>
                      <CheckSvg />
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dropdown;

import type { CSSProperties, ReactNode } from 'react';

/**
 * Shared admin atoms — inline styles carry the exact values from
 * ShakurAdminPanel.dc.html. The admin UI is English-only by contract.
 */

export const FONT = "'Inter', sans-serif";

export const inputStyle: CSSProperties = {
  border: '1px solid #E7E5E4',
  borderRadius: 10,
  padding: '12px 13px',
  fontSize: 15,
  outline: 'none',
  fontFamily: FONT,
  color: '#160C00',
  width: '100%',
};

export const monoInputStyle: CSSProperties = {
  ...inputStyle,
  fontFamily: 'monospace',
  color: '#54504D',
};

/** Focus ring used across the design: orange border + soft orange glow. */
export function focusHandlers() {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = '#FB8500';
      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,133,0,0.15)';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = '#E7E5E4';
      e.currentTarget.style.boxShadow = 'none';
    },
  };
}

export function Field({
  label,
  children,
  style,
}: {
  label: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        fontSize: 13,
        fontWeight: 600,
        ...style,
      }}
    >
      {label}
      {children}
    </label>
  );
}

/**
 * Pill toggle switch. Design variants:
 *  - card publish toggle: 36x21 track, 15px knob travel
 *  - weekly day toggle:   42x24 track, 18px knob travel
 *  - settings toggle:     46x26 track, 20px knob travel
 */
export function Toggle({
  on,
  onToggle,
  width = 46,
  height = 26,
  travel = 20,
  onColor = '#FB8500',
  ariaLabel,
}: {
  on: boolean;
  onToggle: () => void;
  width?: number;
  height?: number;
  travel?: number;
  onColor?: string;
  ariaLabel?: string;
}) {
  const knob = height - 6;
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      style={{
        width,
        height,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        background: on ? onColor : '#E7E5E4',
        position: 'relative',
        flexShrink: 0,
        transition: 'background .18s ease',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          width: knob,
          height: knob,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transform: `translateX(${on ? travel : 0}px)`,
          transition: 'transform .18s ease',
        }}
      />
    </button>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="adm-spin"
      style={{
        width: size,
        height: size,
        border: '2.5px solid rgba(22,12,0,0.15)',
        borderTopColor: '#FB8500',
        borderRadius: '50%',
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Icons (stroke geometry copied verbatim from the design SVGs)        */
/* ------------------------------------------------------------------ */

type IconProps = { size?: number; stroke?: string; strokeWidth?: number };

const svgProps = (size: number, stroke: string, strokeWidth: number) =>
  ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }) as const;

export const IconEdit = ({ size = 15, stroke = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const IconDuplicate = ({
  size = 15,
  stroke = 'currentColor',
  strokeWidth = 2,
}: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconTrash = ({ size = 15, stroke = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IconClose = ({
  size = 18,
  stroke = 'currentColor',
  strokeWidth = 2.2,
}: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconRetry = ({
  size = 15,
  stroke = 'currentColor',
  strokeWidth = 2.2,
}: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

export const IconPlus = ({ size = 17, stroke = '#160C00', strokeWidth = 2.4 }: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IconEye = ({ size = 16, stroke = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconCheck = ({ size = 16, stroke = 'currentColor', strokeWidth = 2.6 }: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconWarning = ({
  size = 28,
  stroke = 'currentColor',
  strokeWidth = 1.9,
}: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconImage = ({ size = 13, stroke = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export const IconPlay = ({ size = 9 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const IconCalendar = ({
  size = 30,
  stroke = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const IconProjects = ({
  size = 19,
  stroke = 'currentColor',
  strokeWidth = 1.9,
}: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <path d="M3 7v13h18V7" />
    <path d="M3 7l2-4h14l2 4" />
    <path d="M9 12h6" />
  </svg>
);

export const IconServices = ({
  size = 19,
  stroke = 'currentColor',
  strokeWidth = 1.9,
}: IconProps) => (
  <svg {...svgProps(size, stroke, strokeWidth)}>
    <path d="M14 4l2 2-8 8-2-2z" />
    <path d="M4 14l6 6" />
    <path d="M18 8l2 2" />
  </svg>
);

export const IconSparkle = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FB8500">
    <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9z" />
  </svg>
);

/** Small 32/34px square icon button with hover accent (design action buttons). */
export function IconBtn({
  onClick,
  label,
  danger = false,
  size = 32,
  children,
  title,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  danger?: boolean;
  size?: number;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      style={{
        width: size,
        height: size,
        border: `1px solid ${danger ? '#F3D6D6' : '#E7E5E4'}`,
        background: '#fff',
        borderRadius: 9,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: danger ? '#D64545' : '#54504D',
        flexShrink: 0,
        transition: 'border-color .15s ease, color .15s ease, background .15s ease',
      }}
      onMouseEnter={(e) => {
        if (danger) e.currentTarget.style.background = '#FBE7E7';
        else {
          e.currentTarget.style.borderColor = '#FB8500';
          e.currentTarget.style.color = '#FB8500';
        }
      }}
      onMouseLeave={(e) => {
        if (danger) e.currentTarget.style.background = '#fff';
        else {
          e.currentTarget.style.borderColor = '#E7E5E4';
          e.currentTarget.style.color = '#54504D';
        }
      }}
    >
      {children}
    </button>
  );
}

/** Solid orange primary button (design 'Add Project' / 'Publish' / 'Save changes'). */
export function PrimaryBtn({
  onClick,
  children,
  style,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  style?: CSSProperties;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        background: '#FB8500',
        color: '#160C00',
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: 15,
        padding: '12px 18px',
        borderRadius: 10,
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1,
        transition: 'background .15s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = '#FFB703';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#FB8500';
      }}
    >
      {children}
    </button>
  );
}

/** White bordered secondary button with orange hover (design 'Try again' etc.). */
export function GhostBtn({
  onClick,
  children,
  style,
}: {
  onClick: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        border: '1px solid #E7E5E4',
        cursor: 'pointer',
        background: '#fff',
        color: '#160C00',
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: 14,
        padding: '10px 18px',
        borderRadius: 10,
        transition: 'border-color .15s ease, color .15s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#FB8500';
        e.currentTarget.style.color = '#FB8500';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E7E5E4';
        e.currentTarget.style.color = '#160C00';
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Formatting helpers ported from the design DCLogic                   */
/* ------------------------------------------------------------------ */

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** '2026-07-15' -> '15 Jul 2026' (design fmtDate). */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Deterministic initials, e.g. 'Elīna Bērziņa' -> 'EB' (design initials()). */
export function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (((p[0] ?? '')[0] ?? '') + ((p[1] ?? '')[0] ?? '')).toUpperCase();
}

/** Deterministic avatar palette (design avatarColors, ported verbatim). */
export function avatarColors(name: string): [string, string] {
  const palette: [string, string][] = [
    ['#FFF3E4', '#B7791F'],
    ['#E6F4EC', '#1F8A5B'],
    ['#E9EDF7', '#3B5BA5'],
    ['#F3E8F5', '#8A4F9E'],
    ['#FBE7E7', '#D64545'],
  ];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % palette.length;
  return palette[h];
}

/** Meeting status badge [bg, color, label] (design meetingBadge). */
export function meetingBadge(st: string): [string, string, string] {
  if (st === 'completed') return ['#E6F4EC', '#1F8A5B', 'Completed'];
  if (st === 'canceled') return ['#FBE7E7', '#D64545', 'Canceled'];
  return ['#FDF0DC', '#B7791F', 'Scheduled'];
}

/** '•••…tail' key masking (design mask()). */
export function maskValue(v: string, tail = 4): string {
  if (!v) return '';
  return '•'.repeat(Math.max(0, v.length - tail)) + v.slice(-tail);
}

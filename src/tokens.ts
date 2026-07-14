/**
 * Design tokens extracted literally from Shakur.dc.html (+ CtaSection, FaqSection,
 * ProcessSteps). Every value here appears verbatim in the design source — nothing is
 * rounded, renamed, or approximated. tailwind.config.js mirrors this file.
 */

export const colors = {
  /** Primary ink. Body text, dark sections, header, booking sidebar. */
  ink: '#160C00',
  white: '#FFFFFF',

  /** Brand orange — buttons, accents, active nav underline, icon strokes. */
  orange: '#FB8500',
  /** Orange hover state. */
  orangeHover: '#FFB703',

  /** Announcement bar / FAQ highlight yellow. */
  yellow: '#FCCC2C',
  yellowHover: '#FFD84D',

  /** Muted body copy. */
  muted: '#54504D',
  /** Long-form service detail copy. */
  mutedDeep: '#3B3835',
  /** Inactive gallery-tab foreground. */
  mutedTab: '#57534E',
  /** Placeholder text, marquee labels, eyebrow labels. */
  placeholder: '#A8A29E',
  /** Disabled calendar days, 404 illustration strokes. */
  stone: '#D6D3D1',
  /** Light copy on dark backgrounds. */
  onDark: '#F3F3F3',

  /** Surfaces. */
  surface: '#F5F5F4',
  surfaceAlt: '#FAFAF9',
  galleryBg: '#0C0C0C',

  /** Borders — distinct values in the design, kept distinct here. */
  borderInput: '#E7E5E4',
  borderCard: '#EAEAE8',
  borderSection: '#EEEDEA',
  borderDivider: '#E0DFDC',

  /** Status. */
  success: '#1F8A5B',
  successBg: '#E6F4EC',
  error: '#D64545',

  /** G2 badge in the footer. */
  g2: '#FB5C35',

  /* --- v2 additions, extracted literally from ShakurAdminPanel.dc.html /
     ShakurDashboard.dc.html / Dropdown.dc.html / DatePicker.dc.html. --- */

  /** Danger actions — delete buttons, error toasts, canceled meeting chips. */
  danger: '#D64545',
  /** Soft danger surface behind canceled / error states. */
  dangerBg: '#FBE7E7',
  /** Dropdown selected option bg, DatePicker "today" bg, admin soft-orange chips. */
  peach: '#FFF3E4',
  /** Deeper peach — admin hover state of peach chips / highlighted rows. */
  peachDeep: '#FFEAD0',
  /** "Paused" / partial-state chip text. */
  amber: '#B7791F',
  /** "Paused" / partial-state chip background. */
  amberBg: '#FDF0DC',
  /** Admin headings ink — slightly lifted from `ink`. */
  ink2: '#3B3733',
  /** Admin secondary text (same value family as `muted`, admin naming). */
  gray650: '#54504D',
  /** Admin tertiary text — table meta, timestamps, collapsed labels. */
  gray450: '#8A8580',
  /** Admin hairline dividers (lighter than borderInput). */
  line2: '#F2F1EF',
  /** Admin filled controls — search field, segmented control track. */
  fill2: '#F0EFEC',
  /** Admin card / panel border (same value as borderInput, admin naming). */
  line3: '#E7E5E4',
  /** Admin custom scrollbar thumb. */
  scroll: '#E0DEDB',
  /** Disabled DatePicker days, muted admin icons (same value as stone). */
  mist: '#D6D3D1',
  /** "Scheduled" meeting chip background. */
  chipBlueBg: '#E9EDF7',
  /** "Scheduled" meeting chip text. */
  chipBlue: '#3B5BA5',
  /** "Rescheduled" chip background. */
  chipPurpleBg: '#F3E8F5',
  /** "Rescheduled" chip text. */
  chipPurple: '#8A4F9E',
} as const;

/** Alpha colors used verbatim in the design. */
export const alpha = {
  headerBorder: 'rgba(255,255,255,0.06)',
  navBtnBorder: 'rgba(255,255,255,0.25)',
  drawerBorder: 'rgba(255,255,255,0.1)',
  onDark55: 'rgba(255,255,255,0.55)',
  onDark45: 'rgba(255,255,255,0.45)',
  onDark85: 'rgba(255,255,255,0.85)',
  onDark82: 'rgba(255,255,255,0.82)',
  onDark75: 'rgba(255,255,255,0.75)',
  onDark60: 'rgba(255,255,255,0.6)',
  onDark18: 'rgba(255,255,255,0.18)',
  footerRule: 'rgba(84,80,77,0.35)',
  faqBody: 'rgba(22,12,0,0.78)',
  chip: 'rgba(22,12,0,0.72)',
  chipSoft: 'rgba(22,12,0,0.58)',
  lightboxBg: 'rgba(10,7,4,0.95)',
  lbBtn: 'rgba(255,255,255,0.14)',
  lbBtnHover: 'rgba(255,255,255,0.26)',
  lbChip: 'rgba(255,255,255,0.12)',
  lbChipHover: 'rgba(255,255,255,0.22)',
  playBtn: 'rgba(251,133,0,0.94)',
  playBtnLarge: 'rgba(251,133,0,0.96)',
  scrim: 'rgba(0,0,0,0.55)',
  navGhostHover: 'rgba(251,133,0,0.08)',
} as const;

/** Gradients, copied exactly. */
export const gradients = {
  heroScrim: 'linear-gradient(252deg, rgba(0,0,0,0) 34%, rgba(0,0,0,0.88) 100%)',
  serviceCard: 'linear-gradient(180deg, rgba(0,0,0,0) 18%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.92) 100%)',
  spaceCard: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
  projectCard: 'linear-gradient(180deg, rgba(0,0,0,0) 48%, rgba(0,0,0,0.72) 100%)',
  servicesGrid: 'linear-gradient(180deg, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.85) 100%)',
  serviceHero: 'linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 70%)',
  projectHero: 'linear-gradient(180deg, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.7) 100%)',
  videoCard: 'linear-gradient(180deg, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.68) 100%)',
  ctaScrim: 'linear-gradient(90deg, rgba(10,7,3,0.92) 0%, rgba(10,7,3,0.75) 34%, rgba(10,7,3,0.15) 70%, rgba(10,7,3,0.05) 100%)',
  marqueeLeft: 'linear-gradient(to right, #fff, transparent)',
  marqueeRight: 'linear-gradient(to left, #fff, transparent)',
} as const;

export const fonts = {
  sans: "'Inter', sans-serif",
  serif: "'Cormorant Garamond', Georgia, serif",
} as const;

/**
 * Fluid type ramp. Each entry is the literal clamp()/size from the design.
 */
export const type = {
  heroTitle: { size: 'clamp(44px, 8.5vw, 92px)', lineHeight: '0.98', letterSpacing: '-1px', weight: 700, family: 'serif' },
  pageTitle: { size: 'clamp(38px, 7vw, 76px)', letterSpacing: '-1px', weight: 700, family: 'serif' },
  detailTitle: { size: 'clamp(36px, 6.5vw, 66px)', lineHeight: '0.98', letterSpacing: '-1.8px', weight: 700, family: 'serif' },
  ctaTitle: { size: 'clamp(38px, 7vw, 68px)', lineHeight: '1.02', letterSpacing: '-1px', weight: 700, family: 'serif' },
  notFoundTitle: { size: 'clamp(34px, 6vw, 64px)', lineHeight: '1.0', letterSpacing: '-2px', weight: 700, family: 'serif' },
  /** Section headings on Home / Services / Projects. */
  sectionTitle: { size: 'clamp(27px, 4.6vw, 40px)', lineHeight: '1.08', letterSpacing: '-1.2px', weight: 600, family: 'sans' },
  /** FAQ + ProcessSteps headings — a different ramp in the design. */
  bandTitle: { size: 'clamp(30px, 5vw, 44px)', letterSpacing: '-1.4px', weight: 600, family: 'sans' },
  galleryTitle: { size: 'clamp(24px, 4vw, 30px)', letterSpacing: '-0.6px', weight: 600, family: 'sans' },
} as const;

/** Spacing scale — every distinct padding/gap value used in the design. */
export const spacing = {
  section: { y: '92px', x: '30px' },
  sectionSm: { y: '80px', x: '30px' },
  band: { y: '96px', x: '30px' },
  cta: { y: '150px', x: '30px' },
  container: '1320px',
  containerWide: '1200px',
  containerMid: '1180px',
  containerNarrow: '1100px',
  containerProcess: '1080px',
  containerGallery: '1000px',
  containerProse: '900px',
  containerFaq: '720px',
} as const;

export const radii = {
  xs: '5px',
  sm: '6px',
  input: '10px',
  btn: '11px',
  md: '12px',
  tab: '13px',
  card: '14px',
  lg: '16px',
  xl: '18px',
  pill: '999px',
  full: '50%',
} as const;

export const shadows = {
  heroForm: '0 30px 60px rgba(0,0,0,0.35)',
  ctaButton: '0 10px 24px rgba(228,163,0,0.4)',
  dropdown: '0 18px 44px rgba(22,12,0,0.16)',
  lightbox: '0 24px 60px rgba(0,0,0,0.5)',
  play: '0 10px 26px rgba(0,0,0,0.4)',
  playLarge: '0 12px 34px rgba(0,0,0,0.5)',
} as const;

/**
 * Motion. The design uses a single expressive ease for entrances and a short
 * linear-ish ease for hovers. framer-motion consumes these as cubic arrays.
 */
export const motion = {
  /** cubic-bezier(0.22, 1, 0.36, 1) — the design's page/modal entrance curve. */
  easeOut: [0.22, 1, 0.36, 1] as const,
  duration: {
    page: 0.42,
    reveal: 0.5,
    pop: 0.3,
    fast: 0.2,
    hover: 0.3,
    imageZoom: 0.5,
  },
  /** Reveal offsets from the design's @keyframes shk-fade / shk-fade-sm. */
  offset: { lg: 14, sm: 7 },
  marquee: { row1: 30, row2: 25 },
} as const;

/** The single breakpoint the design defines (nav collapse, process line). */
export const breakpoints = {
  nav: '900px',
} as const;

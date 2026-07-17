import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LANGS, TR, type Dict, type Lang } from '../../i18n';
import strings from '../../i18n/strings.json';
import { StaticLangProvider } from '../../lang';
import {
  BLUR_DEFAULTS,
  normalizeBlur,
  writeBlurCache,
  type SiteBlur,
} from '../../lib/useSiteChrome';
import { useAdminShell } from '../components/context';
import { FONT } from '../components/ui';

// Previewed public surfaces — rendered for real inside the popover viewport.
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import FaqSection from '../../components/FaqSection';
import CtaSection from '../../components/CtaSection';
import BookingModal from '../../components/BookingModal';
import ConsultationModal from '../../components/ConsultationModal';
import Home from '../../pages/Home';
import Services from '../../pages/Services';
import Projects from '../../pages/Projects';
import ServiceDetail from '../../pages/ServiceDetail';
import ProjectDetail from '../../pages/ProjectDetail';
import Booking from '../../pages/Booking';
import Contact from '../../pages/Contact';
import ComingSoon from '../../pages/ComingSoon';
import NotFound from '../../pages/NotFound';

/**
 * "Website text" admin view — ShakurTextManager.dc.html inside the existing
 * admin shell. Every strings.json leaf is editable in EN/LV/RU; drafts and
 * published overrides persist to `site_texts` (key, draft jsonb, published
 * jsonb). The live preview popover renders the ACTUAL public components in an
 * isolated React root (own MemoryRouter, pinned preview dictionary), walks
 * the text nodes to highlight the edited string, and centers it in the
 * 504×300 viewport. The Hero / Projects-showcase blur toggle persists
 * site_settings.blur_sections.
 *
 * Pre-migration (no site_texts table yet): notice banner + editors disabled,
 * the public site keeps its file defaults.
 */

/* ================================================================== */
/* catalog — every strings.json leaf, exactly once                     */
/* ================================================================== */

type Vals = Record<Lang, string>;

type PreviewKind =
  | 'header'
  | 'home'
  | 'services'
  | 'projects'
  | 'detail'
  | 'contact'
  | 'booking'
  | 'bookingModal'
  | 'consultModal'
  | 'faq'
  | 'cta'
  | 'footer'
  | 'comingSoon'
  | 'notfound';

type SectionDef = {
  id: string;
  name: string;
  sub: string;
  icon: string; // inner SVG markup (24×24 stroke icons, design language)
  preview: PreviewKind;
  path: string; // browser-bar path in the popover
  vpBg: string;
  blur?: keyof SiteBlur;
  keys: string[];
};

/** ShakurTextManager ICONS + same-language additions for the new sections. */
const ICONS: Record<string, string> = {
  header: '<path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h10"></path>',
  hero: '<rect x="3" y="4" width="18" height="14" rx="2"></rect><path d="m3 14 4-4 5 5"></path><circle cx="15" cy="9" r="1.5"></circle>',
  form: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="9" x2="17" y2="9"></line><line x1="7" y1="13" x2="13" y2="13"></line>',
  partners: '<circle cx="12" cy="12" r="3"></circle><path d="M3 12h6"></path><path d="M15 12h6"></path>',
  value: '<path d="M20 6 9 17l-5-5"></path>',
  process:
    '<circle cx="6" cy="6" r="2"></circle><circle cx="6" cy="18" r="2"></circle><path d="M6 8v8"></path><path d="M11 6h9"></path><path d="M11 18h9"></path>',
  projects:
    '<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>',
  services: '<path d="M14 4l2 2-8 8-2-2z"></path><path d="M4 14l6 6"></path><path d="M18 8l2 2"></path>',
  detail:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
  contact: '<rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-10 5L2 7"></path>',
  booking:
    '<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
  modal:
    '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path><circle cx="6.5" cy="6" r="0.5"></circle>',
  consult:
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
  faq: '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  cta: '<path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>',
  footer:
    '<line x1="4" y1="20" x2="20" y2="20"></line><line x1="4" y1="15" x2="14" y2="15"></line><line x1="4" y1="10" x2="10" y2="10"></line>',
  clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
  alert:
    '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
  misc: '<circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle>',
};

/** Row labels straight from the design's SECTIONS table (its known keys). */
const LABELS: Record<string, string> = {
  nav_home: 'Home link',
  nav_projects: 'Projects link',
  nav_services: 'Services link',
  nav_contact: 'Contact link',
  nav_cta: 'Consultation button',
  ann: 'Announcement bar',
  hero_title: 'Headline',
  hero_sub: 'Sub-headline',
  form_email: 'E-mail field label',
  form_phone: 'Phone field label',
  form_book: 'Book button',
  value_title: 'Section title',
  pi_t: 'Benefit 1 · title',
  pi_d: 'Benefit 1 · text',
  bis_t: 'Benefit 2 · title',
  bis_d: 'Benefit 2 · text',
  fast_t: 'Benefit 3 · title',
  fast_d: 'Benefit 3 · text',
  stress_t: 'Benefit 4 · title',
  stress_d: 'Benefit 4 · text',
  planning_title: 'Section title',
  pl1_t: 'Step 1 · title',
  pl1_d: 'Step 1 · text',
  pl2_t: 'Step 2 · title',
  pl2_d: 'Step 2 · text',
  pl3_t: 'Step 3 · title',
  pl3_d: 'Step 3 · text',
  pl4_t: 'Step 4 · title',
  pl4_d: 'Step 4 · text',
  spaces_title: 'Section title',
  view_all: 'View-all button',
  foot_tagline: 'Company tagline',
  copyright: 'Copyright line',
};

function labelFor(key: string): string {
  const known = LABELS[key];
  if (known) return known;
  let k = key;
  let prefix = '';
  if (k.startsWith('ph_')) {
    prefix = 'Placeholder · ';
    k = k.slice(3);
  } else if (k.startsWith('a11y_')) {
    prefix = 'A11y · ';
    k = k.slice(5);
  } else if (k.startsWith('alt_')) {
    prefix = 'Alt text · ';
    k = k.slice(4);
  }
  const words = k.replace(/_/g, ' ').trim();
  return prefix + words.charAt(0).toUpperCase() + words.slice(1);
}

type SectionConfig = Omit<SectionDef, 'keys'> & {
  /** Dot paths into strings.json whose leaves belong to this card. */
  sources: string[];
  only?: string[];
  exclude?: string[];
};

const SECTION_CONFIG: SectionConfig[] = [
  { id: 'header', name: 'Header & navigation', sub: 'Top bar, menu links & call-to-action', icon: ICONS.header, preview: 'header', path: '/', vpBg: '#fff', sources: ['nav', 'announcement'] },
  { id: 'hero', name: 'Hero', sub: 'Headline over the cover photo', icon: ICONS.hero, preview: 'home', path: '/', vpBg: '#160C00', blur: 'hero', sources: ['home.hero'], only: ['hero_title', 'hero_sub'] },
  { id: 'form', name: 'Lead capture form', sub: 'Hero booking card', icon: ICONS.form, preview: 'home', path: '/', vpBg: '#160C00', sources: ['home.hero'], exclude: ['hero_title', 'hero_sub'] },
  { id: 'partners', name: 'Partner logos', sub: 'Trust marquee labels', icon: ICONS.partners, preview: 'home', path: '/', vpBg: '#fff', sources: ['home.partners'] },
  { id: 'value', name: 'Value proposition', sub: '“Your partner” benefits list', icon: ICONS.value, preview: 'home', path: '/#about', vpBg: '#fff', sources: ['home.values'] },
  { id: 'process', name: 'Process steps', sub: '“From planning to perfection”', icon: ICONS.process, preview: 'home', path: '/#process', vpBg: '#F5F5F4', sources: ['home.process'] },
  { id: 'projects', name: 'Projects showcase', sub: 'Dark gallery band', icon: ICONS.projects, preview: 'home', path: '/#projects', vpBg: '#160C00', blur: 'projects', sources: ['home.projects'] },
  { id: 'home_services', name: 'Home services', sub: 'Service cards & reliable-partner grid', icon: ICONS.services, preview: 'home', path: '/', vpBg: '#fff', sources: ['home.services'] },
  { id: 'services_page', name: 'Services page', sub: 'Graphic header, filters & page CTA', icon: ICONS.services, preview: 'services', path: '/services', vpBg: '#fff', sources: ['services_page'] },
  { id: 'projects_page', name: 'Projects page', sub: 'Index header & load-more', icon: ICONS.projects, preview: 'projects', path: '/projects', vpBg: '#fff', sources: ['projects_page'] },
  { id: 'detail', name: 'Detail pages', sub: 'Project & service detail copy', icon: ICONS.detail, preview: 'detail', path: '/services', vpBg: '#fff', sources: ['detail'] },
  { id: 'contact', name: 'Contact page', sub: 'Form labels, info card & map', icon: ICONS.contact, preview: 'contact', path: '/contact', vpBg: '#fff', sources: ['contact'] },
  { id: 'booking_page', name: 'Manage booking', sub: 'Cancel / reschedule page', icon: ICONS.booking, preview: 'booking', path: '/booking', vpBg: '#F5F5F4', sources: ['booking'] },
  { id: 'modal_booking', name: 'Booking modal', sub: 'Date → time → details flow', icon: ICONS.modal, preview: 'bookingModal', path: '/', vpBg: '#160C00', sources: ['modals.booking'] },
  { id: 'modal_consult', name: 'Consultation modal', sub: 'Request-a-consultation overlay', icon: ICONS.consult, preview: 'consultModal', path: '/', vpBg: '#160C00', sources: ['modals.consultation'] },
  { id: 'faq', name: 'Help Center', sub: 'Frequently asked questions', icon: ICONS.faq, preview: 'faq', path: '/#faq', vpBg: '#fff', sources: ['faq'] },
  { id: 'cta', name: 'CTA banner', sub: 'Book-a-consultation band', icon: ICONS.cta, preview: 'cta', path: '/', vpBg: '#160C00', sources: ['cta'] },
  { id: 'footer', name: 'Footer', sub: 'Company tagline & legal line', icon: ICONS.footer, preview: 'footer', path: '/', vpBg: '#fff', sources: ['footer'] },
  { id: 'coming_soon', name: 'Coming soon', sub: 'Maintenance-mode page', icon: ICONS.clock, preview: 'comingSoon', path: '/', vpBg: '#160C00', sources: ['coming_soon'] },
  { id: 'notfound', name: 'Not found', sub: '404 page', icon: ICONS.alert, preview: 'notfound', path: '/404', vpBg: '#fff', sources: ['notfound'] },
  { id: 'misc', name: 'Misc & dates', sub: 'Galleries, static services, dates & a11y', icon: ICONS.misc, preview: 'detail', path: '/services', vpBg: '#fff', sources: ['misc'] },
];

function isLeaf(node: Record<string, unknown>): boolean {
  return LANGS.some((l) => typeof node[l] === 'string');
}

/** Leaf keys under a node, in file order. */
function leavesUnder(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    if (isLeaf(value as Record<string, unknown>)) out.push(key);
    else leavesUnder(value, out);
  }
}

function nodeAt(path: string): unknown {
  let node: unknown = strings;
  for (const seg of path.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[seg];
  }
  return node;
}

/** Builds the section catalog; guarantees every leaf appears exactly once. */
function buildCatalog(): SectionDef[] {
  const claimed = new Set<string>();
  const sections: SectionDef[] = [];
  for (const cfg of SECTION_CONFIG) {
    const keys: string[] = [];
    for (const src of cfg.sources) leavesUnder(nodeAt(src), keys);
    const filtered = keys.filter((k) => {
      if (claimed.has(k)) return false;
      if (cfg.only && !cfg.only.includes(k)) return false;
      if (cfg.exclude && cfg.exclude.includes(k)) return false;
      return true;
    });
    filtered.forEach((k) => claimed.add(k));
    if (filtered.length > 0) {
      const { sources: _s, only: _o, exclude: _e, ...def } = cfg;
      sections.push({ ...def, keys: filtered });
    }
  }
  // Safety net: any leaf a future strings.json edit adds outside the
  // configured sources still gets a card (grouped by top-level section).
  const stray: Record<string, string[]> = {};
  const walk = (node: unknown, top: string | null): void => {
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      if (isLeaf(value as Record<string, unknown>)) {
        if (!claimed.has(key)) {
          const t = top ?? key;
          (stray[t] = stray[t] ?? []).push(key);
          claimed.add(key);
        }
      } else {
        walk(value, top ?? key);
      }
    }
  };
  walk(strings, null);
  for (const [top, keys] of Object.entries(stray)) {
    const words = top.replace(/_/g, ' ');
    sections.push({
      id: `extra_${top}`,
      name: words.charAt(0).toUpperCase() + words.slice(1),
      sub: 'New texts',
      icon: ICONS.misc,
      preview: 'home',
      path: '/',
      vpBg: '#fff',
      keys,
    });
  }
  return sections;
}

export const CATALOG: SectionDef[] = buildCatalog();
const ALL_KEYS: string[] = CATALOG.flatMap((s) => s.keys);

function fileDefault(key: string): Vals {
  return {
    en: (TR.en as Record<string, string>)[key] ?? '',
    lv: (TR.lv as Record<string, string>)[key] ?? '',
    ru: (TR.ru as Record<string, string>)[key] ?? '',
  };
}

/* ================================================================== */
/* shared bits                                                         */
/* ================================================================== */

const STYLE = `
  @keyframes tmPvIn { from { opacity: 0; transform: translateY(7px) scale(0.985); } to { opacity: 1; transform: none; } }
  @keyframes tmLivePulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.4; } }
  @keyframes tmShimmer { 0% { background-position: -320px 0; } 100% { background-position: 320px 0; } }
  @keyframes tmSpin { to { transform: rotate(360deg); } }
  @keyframes tmFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tmPop { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
  .tm-skel { background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.06) 75%); background-size: 320px 100%; animation: tmShimmer 1.2s infinite linear; border-radius: 6px; }
  .tm-eye:hover { border-color: #FB8500 !important; color: #FB8500 !important; background: #FFF7ED !important; }
  .tm-chev:hover { border-color: #FB8500 !important; color: #FB8500 !important; }
  .tm-ta:focus { border-color: #FB8500 !important; box-shadow: 0 0 0 3px rgba(251,133,0,0.14); }
  .tm-revert:hover { color: #D64545 !important; }
  .tm-savedraft:hover { border-color: #160C00 !important; }
  .tm-publish:hover { background: #FFB703 !important; }
  .tm-puball:hover:not(:disabled) { filter: brightness(0.94); }
  .tm-secpub:hover { filter: brightness(0.96); }
  .tm-keep:hover { border-color: #160C00 !important; }
  .tm-now:hover { background: #FFB703 !important; }
  @media (max-width: 900px) { .tm-fields { grid-template-columns: 1fr !important; } }
`;

const HL_STYLE =
  'background:rgba(251,133,0,0.22);box-shadow:0 0 0 2px rgba(251,133,0,0.7);border-radius:5px;padding:0 2px;';

const LANG_NAMES: Record<Lang, string> = { en: 'English', lv: 'Latvian', ru: 'Russian' };

function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    /does not exist|schema cache/i.test(err.message ?? '')
  );
}

function isMissingColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === '42703' || err.code === 'PGRST204' || /column/i.test(err.message ?? '');
}

function eq(a: Vals, b: Vals): boolean {
  return a.en === b.en && a.lv === b.lv && a.ru === b.ru;
}

function normVals(raw: unknown): Vals | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  return {
    en: typeof o.en === 'string' ? o.en : '',
    lv: typeof o.lv === 'string' ? o.lv : '',
    ru: typeof o.ru === 'string' ? o.ru : '',
  };
}

const SectionIcon = ({ path, size = 18 }: { path: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: path }}
  />
);

const IconEyePv = () => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconUpload = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconWarnAmber = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#B7791F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/* ================================================================== */
/* live preview popover                                                */
/* ================================================================== */

type PreviewState = { key: string; lang: Lang };

type DetailSlugs = { service?: string; project?: string };

function previewTree(
  kind: PreviewKind,
  slugs: DetailSlugs,
  dict: Dict,
  lang: Lang,
  remountKey: string
): JSX.Element {
  let entry = '/';
  let routes: JSX.Element;
  switch (kind) {
    case 'header':
      routes = <Route path="*" element={<Header />} />;
      break;
    case 'services':
      entry = '/services';
      routes = <Route path="*" element={<Services />} />;
      break;
    case 'projects':
      entry = '/projects';
      routes = <Route path="*" element={<Projects />} />;
      break;
    case 'detail':
      if (slugs.service) {
        entry = `/services/${slugs.service}`;
        routes = <Route path="/services/:slug" element={<ServiceDetail />} />;
      } else if (slugs.project) {
        entry = `/projects/${slugs.project}`;
        routes = <Route path="/projects/:slug" element={<ProjectDetail />} />;
      } else {
        // Empty database — fall back to the services index for context.
        entry = '/services';
        routes = <Route path="*" element={<Services />} />;
      }
      break;
    case 'contact':
      entry = '/contact';
      routes = <Route path="*" element={<Contact />} />;
      break;
    case 'booking':
      entry = '/booking/preview';
      routes = <Route path="/booking/:token" element={<Booking />} />;
      break;
    case 'bookingModal':
      routes = <Route path="*" element={<BookingModal onClose={() => {}} />} />;
      break;
    case 'consultModal':
      routes = <Route path="*" element={<ConsultationModal onClose={() => {}} />} />;
      break;
    case 'faq':
      routes = <Route path="*" element={<FaqSection />} />;
      break;
    case 'cta':
      routes = <Route path="*" element={<CtaSection />} />;
      break;
    case 'footer':
      routes = <Route path="*" element={<Footer />} />;
      break;
    case 'comingSoon':
      routes = <Route path="*" element={<ComingSoon />} />;
      break;
    case 'notfound':
      entry = '/404';
      routes = <Route path="*" element={<NotFound />} />;
      break;
    case 'home':
    default:
      routes = <Route path="*" element={<Home />} />;
      break;
  }
  return (
    <div
      key={remountKey}
      style={{
        width: 1260,
        minHeight: 750,
        transform: 'scale(0.4)',
        transformOrigin: 'top left',
        fontFamily: FONT,
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      <StaticLangProvider lang={lang} dict={dict}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>{routes}</Routes>
        </MemoryRouter>
      </StaticLangProvider>
    </div>
  );
}

function PreviewPopover({
  preview,
  rect,
  loading,
  section,
  value,
  dict,
  slugs,
  revision,
  onStay,
  onLeave,
  onLang,
}: {
  preview: PreviewState;
  rect: { top: number; left: number };
  loading: boolean;
  section: SectionDef;
  value: Vals;
  dict: Dict;
  slugs: DetailSlugs;
  revision: number;
  onStay: () => void;
  onLeave: () => void;
  onLang: (l: Lang) => void;
}) {
  const vpRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);
  const offsetRef = useRef(0);

  const empty = !value[preview.lang].trim();

  // Isolated React root: the previewed page gets its own MemoryRouter (a
  // nested <Router> in the admin tree would throw) and clicks can never
  // navigate the admin away.
  useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const mount = document.createElement('div');
    mount.style.cssText = 'position:absolute;top:0;left:0;width:504px;';
    vp.appendChild(mount);
    mountRef.current = mount;
    const root = createRoot(mount);
    rootRef.current = root;
    return () => {
      rootRef.current = null;
      mountRef.current = null;
      // Unmount outside the commit phase (React 18 warns otherwise).
      setTimeout(() => {
        root.unmount();
        mount.remove();
      }, 0);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const mount = mountRef.current;
    if (!root || !mount) return;
    offsetRef.current = 0;
    mount.style.transform = 'translateY(0px)';
    // remountKey: fresh mount per key/lang/edit so injected highlight spans
    // never fight React's reconciliation.
    root.render(
      previewTree(section.preview, slugs, dict, preview.lang, `${preview.key}|${preview.lang}|${revision}`)
    );
  }, [section.preview, slugs, dict, preview.key, preview.lang, revision]);

  // Text-node walk: wrap the first node matching the edited value, then
  // center it in the viewport (translateY on the mount — the popover-local
  // equivalent of scrollIntoView({block:'center'}) that can't jiggle the
  // admin list behind the popover). Retries cover async data inside the page.
  useEffect(() => {
    if (loading) return;
    let disposed = false;
    let attempts = 0;
    let timer: number | undefined;
    const tryHighlight = () => {
      if (disposed) return;
      attempts += 1;
      const mount = mountRef.current;
      const vp = vpRef.current;
      let found = false;
      if (mount && vp) {
        mount.querySelectorAll('[data-tm-hl]').forEach((el) => {
          const parent = el.parentNode;
          if (!parent) return;
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        });
        const target = value[preview.lang].trim();
        if (!target) return; // empty translation — the amber banner covers it
        const walker = document.createTreeWalker(mount, NodeFilter.SHOW_TEXT);
        let node: Node | null = walker.nextNode();
        while (node) {
          if (node.nodeValue && node.nodeValue.trim() === target) {
            const span = document.createElement('span');
            span.setAttribute('data-tm-hl', '1');
            span.style.cssText = HL_STYLE;
            node.parentNode?.insertBefore(span, node);
            span.appendChild(node);
            const spanR = span.getBoundingClientRect();
            const vpR = vp.getBoundingClientRect();
            const contentH = mount.getBoundingClientRect().height;
            const spanMid = spanR.top + spanR.height / 2;
            let next = offsetRef.current + (vpR.top + vpR.height / 2 - spanMid);
            const minOffset = Math.min(0, vpR.height - contentH);
            next = Math.min(0, Math.max(minOffset, next));
            mount.style.transform = `translateY(${next}px)`;
            offsetRef.current = next;
            found = true;
            break;
          }
          node = walker.nextNode();
        }
      }
      if (!found && attempts < 14) timer = window.setTimeout(tryHighlight, 250);
    };
    const raf = requestAnimationFrame(tryHighlight);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [loading, preview.key, preview.lang, value, revision]);

  return createPortal(
    <div
      onMouseEnter={onStay}
      onMouseLeave={onLeave}
      style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        zIndex: 400,
        width: 504,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 28px 80px rgba(22,12,0,0.36)',
        border: '1px solid #EAEAE8',
        overflow: 'hidden',
        animation: 'tmPvIn .18s cubic-bezier(0.22,1,0.36,1)',
        fontFamily: FONT,
      }}
    >
      {/* browser chrome */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 13px',
          background: '#F5F5F4',
          borderBottom: '1px solid #EAEAE8',
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F0A9A0' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F4CE7B' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#A6D9B6' }} />
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: '#fff',
            border: '1px solid #E7E5E4',
            borderRadius: 7,
            padding: '5px 11px',
            fontSize: 12,
            color: '#54504D',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          shakur.lv
          <span style={{ color: '#B9B4AF' }}>{section.path}</span>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: '#E6F4EC',
            color: '#1F8A5B',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 9px',
            borderRadius: 999,
            flexShrink: 0,
            letterSpacing: '0.03em',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#1F8A5B',
              animation: 'tmLivePulse 1.6s infinite ease-in-out',
            }}
          />
          LIVE
        </span>
      </div>

      {/* viewport */}
      <div
        ref={vpRef}
        style={{
          position: 'relative',
          width: 504,
          height: 300,
          overflow: 'hidden',
          background: section.vpBg,
        }}
      >
        {!loading && empty && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 6,
              background: '#FDF0DC',
              color: '#B7791F',
              fontSize: 12,
              fontWeight: 600,
              padding: '7px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            No {LANG_NAMES[preview.lang]} translation yet — showing the layout with an empty slot
          </div>
        )}
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 8,
              background: '#1c130a',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 26,
            }}
          >
            <div className="tm-skel" style={{ width: '54%', height: 26 }} />
            <div className="tm-skel" style={{ width: '82%', height: 13 }} />
            <div className="tm-skel" style={{ width: '74%', height: 13 }} />
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FB8500" strokeWidth={2.4} strokeLinecap="round" style={{ animation: 'tmSpin 1s linear infinite', transformOrigin: 'center' }}>
                <path d="M21 12a9 9 0 1 1-6.2-8.5" />
              </svg>
              Loading live component…
            </div>
          </div>
        )}
      </div>

      {/* footer bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '10px 14px',
          borderTop: '1px solid #EAEAE8',
          background: '#fff',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12,
            color: '#54504D',
            minWidth: 0,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FB8500" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Live component · {section.name}
          </span>
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {LANGS.map((code) => {
            const active = code === preview.lang;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onLang(code)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.03em',
                  padding: '5px 10px',
                  borderRadius: 7,
                  background: active ? '#160C00' : 'transparent',
                  color: active ? '#fff' : '#54504D',
                }}
              >
                {code.toUpperCase()}
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: value[code].trim() ? '#1F8A5B' : '#C7C3BF',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ================================================================== */
/* main view                                                           */
/* ================================================================== */

type Filter = 'all' | 'unsaved' | 'incomplete';
type DbState = 'loading' | 'ready' | 'missing' | 'error';

const PV_W = 504;
const PV_H = 392;

export default function TextsView() {
  const { toast, search } = useAdminShell();

  const initialVals = useMemo(() => {
    const v: Record<string, Vals> = {};
    for (const k of ALL_KEYS) v[k] = fileDefault(k);
    return v;
  }, []);

  const [vals, setVals] = useState<Record<string, Vals>>(initialVals);
  const [base, setBase] = useState<Record<string, Vals>>(initialVals);
  const [status, setStatus] = useState<Record<string, 'published' | 'draft'>>({});
  const [dbState, setDbState] = useState<DbState>('loading');
  const [dbError, setDbError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmCount, setConfirmCount] = useState<number | null>(null);

  const [blur, setBlur] = useState<SiteBlur>({ ...BLUR_DEFAULTS });
  const [blurAvailable, setBlurAvailable] = useState(true);

  const [slugs, setSlugs] = useState<DetailSlugs>({});

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [pvRect, setPvRect] = useState<{ top: number; left: number }>({ top: 120, left: 120 });
  const [pvLoading, setPvLoading] = useState(false);
  const pvHideTimer = useRef<number | undefined>(undefined);
  const pvLoadTimer = useRef<number | undefined>(undefined);
  const previewRef = useRef<PreviewState | null>(null);
  previewRef.current = preview;

  const editable = dbState === 'ready';

  /* ---- load ---- */

  const load = useCallback(async () => {
    if (!supabase) {
      setDbState('missing');
      return;
    }
    setDbState('loading');
    const [textsRes, blurRes] = await Promise.all([
      supabase.from('site_texts').select('key, published, draft'),
      supabase.from('site_settings').select('blur_sections').eq('id', 1).maybeSingle(),
    ]);

    if (blurRes.error) {
      setBlurAvailable(false);
      setBlur({ ...BLUR_DEFAULTS });
    } else {
      setBlurAvailable(true);
      setBlur(normalizeBlur((blurRes.data as { blur_sections?: unknown } | null)?.blur_sections));
    }

    if (textsRes.error) {
      if (isMissingTable(textsRes.error)) {
        setDbState('missing');
      } else {
        setDbError(textsRes.error.message);
        setDbState('error');
      }
      return;
    }
    const nextVals: Record<string, Vals> = {};
    const nextStatus: Record<string, 'published' | 'draft'> = {};
    for (const k of ALL_KEYS) nextVals[k] = fileDefault(k);
    for (const row of (textsRes.data ?? []) as {
      key?: unknown;
      published?: unknown;
      draft?: unknown;
    }[]) {
      if (typeof row.key !== 'string' || !(row.key in nextVals)) continue;
      const published = normVals(row.published);
      const draft = normVals(row.draft);
      const baseline = draft ?? published;
      if (baseline) nextVals[row.key] = baseline;
      if (draft) nextStatus[row.key] = 'draft';
    }
    setVals(nextVals);
    setBase(nextVals);
    setStatus(nextStatus);
    setDbState('ready');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // One published slug per detail page so the preview can render the real thing.
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;
    void (async () => {
      const [svc, prj] = await Promise.all([
        client
          .from('services')
          .select('slug')
          .eq('published', true)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle(),
        client
          .from('projects')
          .select('slug')
          .eq('published', true)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setSlugs({
        service: (svc.data as { slug?: string } | null)?.slug,
        project: (prj.data as { slug?: string } | null)?.slug,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- derived ---- */

  const dirty = useCallback((k: string) => !eq(vals[k], base[k]), [vals, base]);

  const dirtyKeys = useMemo(() => ALL_KEYS.filter((k) => dirty(k)), [dirty]);
  const incompleteKeys = useMemo(
    () =>
      ALL_KEYS.filter((k) => {
        const v = vals[k];
        return !(v.en.trim() && v.lv.trim() && v.ru.trim());
      }),
    [vals]
  );

  const q = search.trim().toLowerCase();

  const visibleSections = useMemo(
    () =>
      CATALOG.map((sec) => {
        const rows = sec.keys.filter((k) => {
          const v = vals[k];
          if (filter === 'unsaved' && !dirty(k)) return false;
          if (filter === 'incomplete' && v.en.trim() && v.lv.trim() && v.ru.trim()) return false;
          if (q) {
            const hay = `${labelFor(k)} ${k} ${v.en} ${v.lv} ${v.ru} ${sec.name}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        return { sec, rows };
      }).filter((s) => s.rows.length > 0),
    [filter, q, vals, dirty]
  );

  // Bumps on any edit so an open preview remounts with the latest copy.
  const revision = useMemo(() => {
    let h = 0;
    if (!preview) return 0;
    const s = JSON.stringify(vals[preview.key]);
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }, [preview, vals]);

  const pvDict = useMemo<Dict | null>(() => {
    if (!preview) return null;
    const L = preview.lang;
    const dict: Record<string, string> = { ...(TR[L] as Record<string, string>) };
    for (const k of ALL_KEYS) {
      const v = vals[k][L];
      if (v.trim()) dict[k] = v;
    }
    // The edited key always shows its exact current value — an empty edit
    // previews as an empty slot (with the amber banner), not the default.
    dict[preview.key] = vals[preview.key][L];
    return dict as Dict;
  }, [preview, vals]);

  const pvSection = useMemo(
    () => (preview ? CATALOG.find((s) => s.keys.includes(preview.key)) ?? null : null),
    [preview]
  );

  /* ---- persistence ---- */

  const migrationToast = () =>
    toast('Run supabase/migrate-v5.sql first — the site_texts table is missing');

  const persist = useCallback(
    async (keys: string[], publish: boolean): Promise<boolean> => {
      if (!supabase) return false;
      if (dbState !== 'ready') {
        migrationToast();
        return false;
      }
      if (keys.length === 0) return true;
      const payload = keys.map((k) =>
        publish
          ? { key: k, published: { ...vals[k] }, draft: null }
          : { key: k, draft: { ...vals[k] } }
      );
      const { error } = await supabase.from('site_texts').upsert(payload);
      if (error) {
        if (isMissingTable(error)) migrationToast();
        else toast(`Couldn't save — ${error.message}`);
        return false;
      }
      setBase((b) => {
        const next = { ...b };
        for (const k of keys) next[k] = { ...vals[k] };
        return next;
      });
      setStatus((m) => {
        const next = { ...m };
        for (const k of keys) {
          if (publish) delete next[k];
          else next[k] = 'draft';
        }
        return next;
      });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vals, dbState, toast]
  );

  const saveItem = async (key: string, publish: boolean) => {
    if (await persist([key], publish)) {
      toast(publish ? 'Published to the live site' : 'Saved as draft');
    }
  };

  const revertItem = (key: string) => {
    setVals((v) => ({ ...v, [key]: { ...base[key] } }));
    toast('Changes reverted');
  };

  const publishSection = async (sec: SectionDef) => {
    const keys = sec.keys.filter((k) => dirty(k) || status[k] === 'draft');
    if (await persist(keys, true)) {
      toast(`${sec.name} published`);
    }
  };

  const askPublishAll = () => {
    if (dirtyKeys.length === 0) return;
    setConfirmCount(dirtyKeys.length);
  };

  const doPublishAll = async () => {
    const keys = ALL_KEYS.filter((k) => dirty(k) || status[k] === 'draft');
    setConfirmCount(null);
    if (await persist(keys, true)) {
      toast('All changes published to the live site');
    }
  };

  const toggleBlur = async (which: keyof SiteBlur) => {
    if (!supabase) return;
    if (!blurAvailable) {
      toast('Run supabase/migrate-v5.sql first — the blur_sections column is missing');
      return;
    }
    const next: SiteBlur = { ...blur, [which]: !blur[which] };
    setBlur(next);
    const { error } = await supabase
      .from('site_settings')
      .upsert({ id: 1, blur_sections: next });
    if (error) {
      setBlur(blur);
      if (isMissingColumn(error) || isMissingTable(error)) {
        setBlurAvailable(false);
        toast('Run supabase/migrate-v5.sql first — the blur_sections column is missing');
      } else {
        toast(`Couldn't save — ${error.message}`);
      }
      return;
    }
    writeBlurCache(next);
    toast(`Blur panel ${next[which] ? 'enabled' : 'disabled'}`);
  };

  /* ---- edits ---- */

  const onField = (key: string, lang: Lang, value: string) =>
    setVals((v) => ({ ...v, [key]: { ...v[key], [lang]: value } }));

  /* ---- preview intent (design: 130ms hover-out, ≥470ms skeleton) ---- */

  const openPreview = (e: React.SyntheticEvent, key: string) => {
    let rect = pvRect;
    try {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      let left = r.left - PV_W - 14;
      if (left < 12) left = r.right + 14;
      if (left + PV_W > window.innerWidth - 12) left = Math.max(12, window.innerWidth - 12 - PV_W);
      let top = r.top + r.height / 2 - PV_H / 2;
      top = Math.max(12, Math.min(top, window.innerHeight - 12 - PV_H));
      rect = { top, left };
    } catch {
      /* keep the previous rect */
    }
    window.clearTimeout(pvHideTimer.current);
    const same = previewRef.current?.key === key;
    setPreview((p) => ({ key, lang: p?.lang ?? 'en' }));
    setPvRect(rect);
    setPvLoading(!same);
    if (!same) {
      window.clearTimeout(pvLoadTimer.current);
      pvLoadTimer.current = window.setTimeout(() => {
        if (previewRef.current?.key === key) setPvLoading(false);
      }, 470);
    }
  };

  const pvStay = () => window.clearTimeout(pvHideTimer.current);
  const pvLeave = () => {
    window.clearTimeout(pvHideTimer.current);
    pvHideTimer.current = window.setTimeout(() => {
      setPreview(null);
      setPvLoading(false);
    }, 130);
  };

  useEffect(
    () => () => {
      window.clearTimeout(pvHideTimer.current);
      window.clearTimeout(pvLoadTimer.current);
    },
    []
  );

  /* ================================================================ */
  /* render                                                            */
  /* ================================================================ */

  const filterPills: { id: Filter; label: string; n?: number }[] = [
    { id: 'all', label: 'All' },
    { id: 'unsaved', label: 'Unsaved', n: dirtyKeys.length },
    { id: 'incomplete', label: 'Needs translation', n: incompleteKeys.length },
  ];

  const dirtyCount = dirtyKeys.length;

  if (dbState === 'loading') {
    return (
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <style>{STYLE}</style>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{ background: '#fff', border: '1px solid #EAEAE8', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div className="adm-skel" style={{ width: 220, height: 20 }} />
            <div className="adm-skel" style={{ width: '100%', height: 64 }} />
            <div className="adm-skel" style={{ width: '100%', height: 64 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <style>{STYLE}</style>

      {/* pre-migration / error notice */}
      {dbState !== 'ready' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: '#FDF0DC',
            border: '1px solid #F0D8B8',
            borderRadius: 11,
            padding: '12px 14px',
            marginBottom: 18,
          }}
        >
          <IconWarnAmber />
          <span style={{ fontSize: 13, color: '#8A6A2E', lineHeight: 1.55 }}>
            {dbState === 'missing' ? (
              <>
                The database doesn&apos;t have the <strong>site_texts</strong> table yet — run{' '}
                <strong>supabase/migrate-v5.sql</strong> in the Supabase SQL editor to enable
                editing. Until then the public site shows the built-in copy below.
              </>
            ) : (
              <>
                Couldn&apos;t load the saved texts ({dbError}). Editing is disabled —{' '}
                <button
                  type="button"
                  onClick={() => void load()}
                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#B7791F', fontWeight: 700, fontFamily: FONT, fontSize: 13, textDecoration: 'underline' }}
                >
                  retry
                </button>
                .
              </>
            )}
          </span>
        </div>
      )}

      {/* ============ toolbar ============ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ display: 'flex', gap: 5, background: '#EFEEEB', padding: 5, borderRadius: 12 }}>
          {filterPills.map((p) => {
            const active = filter === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setFilter(p.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 13,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#160C00' : '#54504D',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {p.label}
                {p.n != null && p.n > 0 && (
                  <span
                    style={{
                      background: active ? '#FB8500' : '#DED9D3',
                      color: active ? '#160C00' : '#6B655F',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: '1px 7px',
                      minWidth: 18,
                      textAlign: 'center',
                    }}
                  >
                    {p.n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 13,
              fontWeight: 500,
              color: dirtyCount === 0 ? '#8A8580' : '#B7791F',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: dirtyCount === 0 ? '#1F8A5B' : '#B7791F',
              }}
            />
            {dirtyCount === 0
              ? 'All changes published'
              : `${dirtyCount} unsaved ${dirtyCount === 1 ? 'change' : 'changes'}`}
          </span>
          <button
            type="button"
            className="tm-puball"
            onClick={askPublishAll}
            disabled={dirtyCount === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              cursor: dirtyCount === 0 ? 'default' : 'pointer',
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 14,
              padding: '11px 18px',
              borderRadius: 11,
              background: dirtyCount === 0 ? '#EFEEEB' : '#FB8500',
              color: dirtyCount === 0 ? '#A8A29E' : '#160C00',
            }}
          >
            <IconUpload />
            Publish all
          </button>
        </div>
      </div>

      {/* ============ sections ============ */}
      {visibleSections.length === 0 && (
        <div
          style={{
            border: '1.5px dashed #DDD9D4',
            borderRadius: 18,
            padding: '60px 30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: '#F0EFEC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A8A29E',
            }}
          >
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>No matching texts</h3>
          <p style={{ margin: 0, fontSize: 14, color: '#8A8580', maxWidth: 340, lineHeight: 1.55 }}>
            Try a different search term or clear the active filter.
          </p>
        </div>
      )}

      {visibleSections.map(({ sec, rows }) => {
        const isExpanded = expanded[sec.id] !== false;
        const secDirty = sec.keys.some((k) => dirty(k));
        const summary = LANGS.map((code) => {
          const total = sec.keys.length;
          const done = sec.keys.filter((k) => vals[k][code].trim()).length;
          if (done === total) return { code, color: '#1F8A5B', dot: '#1F8A5B', ring: 'none' };
          if (done === 0)
            return { code, color: '#A8A29E', dot: 'transparent', ring: 'inset 0 0 0 1.5px #C7C3BF' };
          return { code, color: '#B7791F', dot: '#B7791F', ring: 'none' };
        });
        const blurOn = sec.blur ? blur[sec.blur] : false;
        return (
          <div
            key={sec.id}
            style={{
              background: '#fff',
              border: '1px solid #EAEAE8',
              borderRadius: 18,
              marginBottom: 18,
              overflow: 'hidden',
            }}
          >
            {/* section header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '17px 20px',
                borderBottom: isExpanded ? '1px solid #F0EFEC' : 'none',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="tm-chev"
                onClick={() => setExpanded((x) => ({ ...x, [sec.id]: !isExpanded }))}
                aria-label="Toggle section"
                style={{
                  width: 30,
                  height: 30,
                  border: '1px solid #EAEAE8',
                  background: '#fff',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#A8A29E',
                  flexShrink: 0,
                }}
              >
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${isExpanded ? 90 : 0}deg)`, transition: 'transform .18s ease' }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#FFF3E4',
                  color: '#FB8500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SectionIcon path={sec.icon} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>{sec.name}</span>
                  <span style={{ fontSize: 12, color: '#A8A29E' }}>{sec.keys.length} texts</span>
                </div>
                <span style={{ fontSize: 12.5, color: '#A8A29E' }}>{sec.sub}</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 11 }}>
                  {summary.map((c) => (
                    <span
                      key={c.code}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        color: c.color,
                      }}
                    >
                      {c.code.toUpperCase()}
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, boxShadow: c.ring }} />
                    </span>
                  ))}
                </div>

                {/* blur widget (Hero + Projects showcase only) */}
                {sec.blur && (
                  <div
                    title={
                      blurAvailable
                        ? undefined
                        : 'Run supabase/migrate-v5.sql to enable the blur panel switch'
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: '#FAFAF9',
                      border: '1px solid #EEEDEA',
                      borderRadius: 13,
                      padding: '8px 11px 8px 13px',
                      opacity: blurAvailable ? 1 : 0.65,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#FB8500" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3a6 6 0 0 0 0 12 6 6 0 0 1 0 6 9 9 0 0 0 0-18z" />
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                        Blur panel behind text
                      </span>
                      <span style={{ fontSize: 11, color: '#A8A29E' }}>Legibility backdrop over photos</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div
                          style={{
                            position: 'relative',
                            width: 58,
                            height: 38,
                            borderRadius: 9,
                            overflow: 'hidden',
                            border: `2px solid ${blurOn ? '#E3E1DE' : '#FB8500'}`,
                          }}
                        >
                          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/images/home-interior.png)', backgroundSize: 'cover', backgroundPosition: '50% 50%' }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.55))' }} />
                          <span style={{ position: 'absolute', left: 6, bottom: 4, color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>Aa</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: blurOn ? '#A8A29E' : '#160C00' }}>Off</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div
                          style={{
                            position: 'relative',
                            width: 58,
                            height: 38,
                            borderRadius: 9,
                            overflow: 'hidden',
                            border: `2px solid ${blurOn ? '#FB8500' : '#E3E1DE'}`,
                          }}
                        >
                          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/images/home-interior.png)', backgroundSize: 'cover', backgroundPosition: '50% 50%' }} />
                          <span style={{ position: 'absolute', left: 5, bottom: 4, top: 12, right: 20, background: 'rgba(22,12,0,0.4)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', borderRadius: 6 }} />
                          <span style={{ position: 'absolute', left: 8, bottom: 5, color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", zIndex: 2 }}>Aa</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: blurOn ? '#160C00' : '#A8A29E' }}>On</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={blurOn}
                      aria-label="Toggle blur panel"
                      onClick={() => void toggleBlur(sec.blur as keyof SiteBlur)}
                      style={{
                        width: 46,
                        height: 26,
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 999,
                        background: blurOn ? '#FB8500' : '#D6D3D0',
                        position: 'relative',
                        flexShrink: 0,
                        transition: 'background .18s ease',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 3,
                          left: 3,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          transform: `translateX(${blurOn ? 20 : 0}px)`,
                          transition: 'transform .2s cubic-bezier(0.22,1,0.36,1)',
                        }}
                      />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="tm-secpub"
                  onClick={() => void publishSection(sec)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    border: secDirty ? 'none' : '1px solid #EAEAE8',
                    cursor: 'pointer',
                    fontFamily: FONT,
                    fontWeight: 600,
                    fontSize: 13,
                    padding: '8px 14px',
                    borderRadius: 9,
                    background: secDirty ? '#160C00' : '#F5F5F4',
                    color: secDirty ? '#fff' : '#8A8580',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Publish section
                </button>
              </div>
            </div>

            {/* rows */}
            {isExpanded && (
              <div style={{ padding: '14px 20px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                {rows.map((key) => {
                  const v = vals[key];
                  const rowDirty = dirty(key);
                  let pillLabel: string;
                  let pillDot: string;
                  let pillBg: string;
                  let pillColor: string;
                  if (rowDirty) {
                    pillLabel = 'Unsaved';
                    pillDot = '#B7791F';
                    pillBg = '#FDF0DC';
                    pillColor = '#B7791F';
                  } else if (status[key] === 'draft') {
                    pillLabel = 'Draft';
                    pillDot = '#A8A29E';
                    pillBg = '#F0EFEC';
                    pillColor = '#8A8580';
                  } else {
                    pillLabel = 'Live';
                    pillDot = '#1F8A5B';
                    pillBg = '#E6F4EC';
                    pillColor = '#1F8A5B';
                  }
                  return (
                    <div
                      key={key}
                      style={{
                        border: `1px solid ${rowDirty ? '#F0D8B8' : '#EEEDEA'}`,
                        borderRadius: 13,
                        padding: '14px 15px',
                        background: rowDirty ? '#FFFDF8' : '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 11 }}>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{labelFor(key)}</span>
                          <span
                            style={{
                              fontFamily: "'SF Mono', ui-monospace, monospace",
                              fontSize: 11,
                              color: '#A8A29E',
                              background: '#F5F5F4',
                              padding: '2px 7px',
                              borderRadius: 6,
                            }}
                          >
                            {key}
                          </span>
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 999,
                            flexShrink: 0,
                            background: pillBg,
                            color: pillColor,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: pillDot }} />
                          {pillLabel}
                        </span>
                        <button
                          type="button"
                          className="tm-eye"
                          aria-label="Preview where this appears on the site"
                          title="Hover to preview on the live site"
                          onMouseEnter={(e) => openPreview(e, key)}
                          onMouseLeave={pvLeave}
                          onFocus={(e) => openPreview(e, key)}
                          onBlur={pvLeave}
                          onClick={(e) => openPreview(e, key)}
                          style={{
                            width: 34,
                            height: 34,
                            border: '1px solid #E7E5E4',
                            background: '#fff',
                            borderRadius: 9,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#54504D',
                            flexShrink: 0,
                          }}
                        >
                          <IconEyePv />
                        </button>
                      </div>
                      <div className="tm-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {LANGS.map((code) => {
                          const filled = !!v[code].trim();
                          return (
                            <div key={code} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#8A8580' }}>
                                  {code.toUpperCase()}
                                </span>
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: filled ? '#1F8A5B' : 'transparent',
                                    boxShadow: filled ? 'none' : 'inset 0 0 0 1.5px #C7C3BF',
                                  }}
                                />
                              </div>
                              <textarea
                                className="tm-ta"
                                value={v[code]}
                                onChange={(e) => onField(key, code, e.target.value)}
                                rows={2}
                                disabled={!editable}
                                placeholder={`Add ${code.toUpperCase()} translation…`}
                                style={{
                                  border: `1px solid ${filled ? '#E7E5E4' : '#E7C9A0'}`,
                                  borderRadius: 9,
                                  padding: '9px 10px',
                                  fontSize: 13.5,
                                  lineHeight: 1.45,
                                  fontFamily: FONT,
                                  color: '#160C00',
                                  outline: 'none',
                                  resize: 'vertical',
                                  background: editable ? '#fff' : '#FAFAF9',
                                  width: '100%',
                                  cursor: editable ? undefined : 'not-allowed',
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      {rowDirty && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11, flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#B7791F' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#B7791F' }} />
                            Unsaved changes
                          </span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              className="tm-revert"
                              onClick={() => revertItem(key)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 13, color: '#8A8580', padding: '8px 10px' }}
                            >
                              Revert
                            </button>
                            <button
                              type="button"
                              className="tm-savedraft"
                              onClick={() => void saveItem(key, false)}
                              style={{ border: '1.5px solid #E7E5E4', background: '#fff', cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 13, color: '#160C00', padding: '8px 14px', borderRadius: 9 }}
                            >
                              Save draft
                            </button>
                            <button
                              type="button"
                              className="tm-publish"
                              onClick={() => void saveItem(key, true)}
                              style={{ border: 'none', background: '#FB8500', cursor: 'pointer', fontFamily: FONT, fontWeight: 600, fontSize: 13, color: '#160C00', padding: '8px 15px', borderRadius: 9 }}
                            >
                              Publish
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ============ live preview ============ */}
      {preview && pvSection && pvDict && (
        <PreviewPopover
          preview={preview}
          rect={pvRect}
          loading={pvLoading}
          section={pvSection}
          value={vals[preview.key]}
          dict={pvDict}
          slugs={slugs}
          revision={revision}
          onStay={pvStay}
          onLeave={pvLeave}
          onLang={(l) => setPreview((p) => (p ? { ...p, lang: l } : p))}
        />
      )}

      {/* ============ publish-all confirm (design copy) ============ */}
      {confirmCount != null &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              fontFamily: FONT,
            }}
          >
            <div
              onClick={() => setConfirmCount(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(22,12,0,0.45)', animation: 'tmFade .2s ease' }}
            />
            <div
              style={{
                position: 'relative',
                width: 420,
                maxWidth: '100%',
                background: '#fff',
                borderRadius: 18,
                padding: 28,
                boxShadow: '0 30px 70px rgba(0,0,0,0.28)',
                animation: 'tmPop .26s cubic-bezier(0.22,1,0.36,1)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 14,
                  background: '#FFF3E4',
                  color: '#FB8500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <IconUpload size={26} />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 700 }}>Publish all changes?</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, color: '#54504D' }}>
                {confirmCount} edited {confirmCount === 1 ? 'text' : 'texts'} will go live across all
                languages right away.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="tm-keep"
                  onClick={() => setConfirmCount(null)}
                  style={{ flex: 1, cursor: 'pointer', background: '#fff', color: '#160C00', border: '1.5px solid #E7E5E4', fontFamily: FONT, fontWeight: 600, fontSize: 15, padding: 12, borderRadius: 10 }}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="tm-now"
                  onClick={() => void doPublishAll()}
                  style={{ flex: 1, cursor: 'pointer', background: '#FB8500', color: '#160C00', border: 'none', fontFamily: FONT, fontWeight: 600, fontSize: 15, padding: 12, borderRadius: 10 }}
                >
                  Publish now
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

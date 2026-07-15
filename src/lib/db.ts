/**
 * v2 data shapes — the single source of truth for rows in Supabase.
 * Matches .design/CONTRACTS.md exactly; do not diverge without updating the contract.
 *
 * Per-language TEXT fields are JSON per field ({ en, lv, ru }); shared fields
 * (media, slug, category, dates, client, location, url, cta) are single-value.
 */

export type Lang = 'en' | 'lv' | 'ru';
export type L10n = Record<Lang, string>;
export type MediaItem = { id: string; type: 'image' | 'video'; src: string; poster?: string };
export type Capability = { number: string; title: L10n; description: L10n; bullets: L10n[] };

export type ProjectRow = {
  id: string; slug: string; service: string;
  status: 'In Progress' | 'Completed' | 'Paused';
  published: boolean; sort_order: number;
  client: string; country: string; city: string; loc: string;
  url: string; start_date: string; end_date: string;   // ISO or ''
  cover: string;                 // media item id ('' = first item)
  media: MediaItem[];
  space_img: string;             // legacy home-grid crop (kept)
  i18n: { title: L10n; summary: L10n; description: L10n };
  scope: { title: L10n; intro: L10n; items: Capability[] };
  created_at: string; updated_at: string;
};

export type ServiceRow = {
  id: string; slug: string;
  category: 'Construction' | 'Finishing' | 'Support';
  published: boolean; sort_order: number;
  cta_label: L10n; cta_link: string;
  cover: string; media: MediaItem[];
  i18n: { title: L10n; summary: L10n; description: L10n };
  capabilities: { title: L10n; intro: L10n; items: Capability[] };
  extras: { highlights: { title: L10n; desc: L10n }[]; facts: { label: L10n; value: L10n }[] };
  created_at: string; updated_at: string;
};

export type MeetingRow = {
  id: string; token: string;
  name: string; email: string; phone: string; notes: string;
  meeting_date: string;          // 'YYYY-MM-DD'
  meeting_time: string;          // 'HH:MM'
  duration_min: number;
  status: 'scheduled' | 'completed' | 'canceled';
  locale: Lang;
  created_at: string; updated_at: string;
};

export type Availability = {
  week: Record<'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'|'Sunday',
               { on: boolean; start: string; end: string }>;
  slot_minutes: number; buffer_minutes: number;
  timezone: string;              // e.g. 'Europe/Riga'
  blockouts: string[];           // ISO dates
};

/** Single-row (id=1) site settings table, seeded from the admin panel design. */
export type SiteSettingsRow = {
  id: number;
  title: string; tagline: string;
  email: string; phone: string;
  lang: string;
  announcement_enabled: boolean;
  announcement_text: string;
  updated_at: string;
};

export function emptyL10n(): L10n {
  return { en: '', lv: '', ru: '' };
}

/** Localized display value with en → first-non-empty fallback. */
export function pick(l10n: L10n | null | undefined, lang: Lang): string {
  if (!l10n) return '';
  return l10n[lang] || l10n.en || l10n.lv || l10n.ru || '';
}

export function mediaCounts(media: MediaItem[]): { images: number; videos: number } {
  let images = 0;
  let videos = 0;
  for (const m of media) {
    if (m.type === 'video') videos += 1;
    else images += 1;
  }
  return { images, videos };
}

/* ---------------------------------------------------------------------------
 * v3 — Home-page CMS, consultation requests, media assets.
 * Matches the V3 ADDENDUM in .design/CONTRACTS.md exactly.
 * ------------------------------------------------------------------------- */

export interface HomePartnerItem { a: L10n; b: L10n }          // title / body
export interface HomeText {
  heroTitle: L10n; heroSub: L10n;
  partnerTitle: L10n; partnerItems: HomePartnerItem[];
  ctaTitle: L10n; ctaSub: L10n; ctaBtn: L10n;
}
export interface HomeImageSection { image: string }            // '/media/…' or 'images/…' preset
export interface HomeSectionsContent {
  hero: HomeImageSection; partner: HomeImageSection; cta: HomeImageSection; text: HomeText;
}
export type HomeSectionKey = 'hero' | 'partner' | 'cta' | 'text';
export interface HomeSectionRow {                              // table home_sections
  section: HomeSectionKey;
  draft: unknown;      // HomeImageSection | HomeText
  published: unknown | null;   // null = never published
  status: 'draft' | 'published';
  updated_at: string;
}

/** Hero "Request a Consultation" lead — server-side inserts only (PII). */
export type ConsultationRequestRow = {
  id: string;
  created_at: string;
  name: string; phone: string; email: string; message: string;
  locale: Lang;
  status: 'new' | 'contacted' | 'closed';
};

/** Home-CMS image upload metadata (POST /api/media; files served at /media/). */
export type MediaAssetRow = {
  id: string;
  created_at: string;
  filename: string;              // stored name (uuid.ext)
  original_name: string;
  mime: string;
  size: number;
  public_path: string;           // '/media/<filename>' (nginx, local-first)
  supabase_url: string | null;   // deterministic public URL in bucket `media`
  replication_status: 'pending' | 'done' | 'failed';
};

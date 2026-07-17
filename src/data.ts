/**
 * Static chrome content for the public site, transcribed from Shakur.dc.html:
 * partner logos, contact details, home "spaces" labels, booking defaults, the
 * media cover helper, and the company registry links.
 *
 * Projects and services content is intentionally NOT here — it lives only in
 * Supabase (useProjects/useServices). The pre-v5 static project/service seed
 * arrays were removed so the database is the single source of truth; an empty
 * or unreachable DB renders the designed empty states, never stale seed
 * content.
 */

import type { MediaItem } from './lib/db';

/** Resolve a row's cover media item ('' = first item) to its src. */
export function coverSrc(row: { cover: string; media: MediaItem[] }): string {
  const item = row.media.find((m) => m.id === row.cover) ?? row.media[0];
  return item?.poster || item?.src || '';
}

export type LogoItem = { name: string; img: string };

/** Home "See the Spaces" labels — these differ from the Projects card labels. */
export const SPACE_LABELS: Record<string, string> = {
  rimi: 'RIMI Milgrāvis',
  kuldiga: 'Kuldīgas parks',
  kepler: 'Kepler Club: Hotel & Lounge at RIX Airport',
  moho: 'MOHO PARK',
  daugavas: 'Daugavas Vieglatlētikas Manēža',
  sweden: 'Private Object in Sweden',
};

export const LOGOS_ROW1: LogoItem[] = [
  { name: 'Mapri', img: 'images/logo-trust-1.png' },
  { name: 'Ekoteh', img: 'images/logo-trust-2.png' },
  { name: 'Angern', img: 'images/logo-trust-3.png' },
  { name: 'MGS', img: 'images/logo-trust-4.png' },
  { name: 'Partner', img: 'images/logo-trust-5.png' },
  { name: 'Asmetal', img: 'images/logo-trust-6.png' },
];

export const LOGOS_ROW2: LogoItem[] = [
  { name: 'Mitt & Perlebach', img: 'images/logo-def-1.png' },
  { name: 'Lidl', img: 'images/logo-def-2.png' },
  { name: 'Jysk', img: 'images/logo-def-3.png' },
  { name: 'Kuldigas Parks', img: 'images/logo-def-4.png' },
  { name: 'Kepler', img: 'images/logo-def-5.png' },
];

export const CONTACT = {
  address: ['Audēju iela 8, LV-1050', 'Rīga, Latvia'],
  email: 'info.andrey.shakur@gmail.com',
  phone: '+37126872727',
} as const;

/** Public registry pages for SIA SHAKUR (reg. no. 51203071901).
 *  TODO(user): confirm these are the right company pages. */
export const REGISTRY_LINKS = {
  lursoft: 'https://company.lursoft.lv/en/shakur/51203071901',
  firmas: 'https://www.firmas.lv/lv/uznemumi/shakur/51203071901',
} as const;

/**
 * Booking defaults from the design's `SC` object — the OFFLINE fallback used
 * when /api/slots is unreachable (dev without the API container).
 */
export const SCHEDULING = {
  days: [1, 2, 3, 4, 5],
  start: '09:00',
  end: '17:00',
  interval: 60,
  duration: 30,
  leadDays: 1,
  horizonDays: 60,
  blocked: [] as string[],
} as const;

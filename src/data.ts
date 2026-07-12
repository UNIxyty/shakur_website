/**
 * Content transcribed from Shakur.dc.html.
 *
 * Projects are served from Supabase at runtime (see useProjects). This module is
 * both the seed for `supabase/schema.sql` and the fallback the site renders when
 * Supabase is not configured — so the page looks exactly like the design either way.
 */

import type { Dict } from './i18n';

export type HowStep = { t: string; d: string };

export type Service = {
  slug: string;
  title: string;
  img: string;
  desc: string;
  whyChooseUs: string[];
  howItWorks: HowStep[];
};

export type Project = {
  slug: string;
  title: string;
  /** Location label shown on the Projects card and the detail hero chip. */
  loc: string;
  /** Card image on the Projects page. */
  img: string;
  /** Card image in the Home "See the Spaces" grid — a different crop in the design. */
  spaceImg: string;
  images: string[];
  service: string;
  country: string;
  city: string;
  client: string;
  start: string;
  end: string;
  status: string;
  official: { label: string; url: string };
};

export type LogoItem = { name: string; img: string };

/** Services are static in the design; titles/descriptions are localized by slug. */
export const SERVICES: Service[] = [
  {
    slug: 'drywall',
    title: 'Drywall Partition Wall Installation',
    img: 'images/svc-1.png',
    desc: 'Expertise in drywall partition systems — precise installation, leveling, and finishing for functional and aesthetic interiors.',
    whyChooseUs: [
      'Certified drywall specialists',
      'Precise leveling and jointing',
      'Soundproof & fire-rated systems',
      'Clean, dust-controlled worksites',
    ],
    howItWorks: [
      { t: 'Contract Setup', d: 'Define requirements and layout' },
      { t: 'Framing', d: 'Metal stud partition assembly' },
      { t: 'Boarding', d: 'Drywall fixing and jointing' },
      { t: 'Finishing', d: 'Sanding, priming, and paint-ready' },
    ],
  },
  {
    slug: 'interior',
    title: 'Complete Interior Finishing Works',
    img: 'images/img-9c88.png',
    desc: 'From plastering to painting and flooring — complete interior finishing delivered with precision and care.',
    whyChooseUs: [
      'Experienced finishing crews',
      'Premium plaster and paint materials',
      'Flawless surfaces and clean edges',
      'On-time, budget-clear delivery',
    ],
    howItWorks: [
      { t: 'Contract Setup', d: 'Define scope and finishes' },
      { t: 'Preparation', d: 'Surface repair and priming' },
      { t: 'Application', d: 'Plastering, painting, flooring' },
      { t: 'Finishing', d: 'Detailing and clean handover' },
    ],
  },
  {
    slug: 'wood',
    title: 'Wood Construction Works',
    img: 'images/img-5279.png',
    desc: 'From structural framing to detailed carpentry, we deliver strong and tailored wood solutions built to last.',
    whyChooseUs: [
      'Expert carpenters with structural knowledge',
      'Sustainable, high-grade timber',
      'Precise assembly and clean finishing',
      'Custom woodwork for unique projects',
    ],
    howItWorks: [
      { t: 'Contract Setup', d: 'Define requirements and design' },
      { t: 'Material Selection', d: 'Choose timber and finishes' },
      { t: 'Construction', d: 'Framing, assembly, and detailing' },
      { t: 'Finishing', d: 'Sanding, sealing, and protection' },
    ],
  },
  {
    slug: 'masonry',
    title: 'Masonry Works',
    img: 'images/img-97b7.png',
    desc: 'We provide professional masonry services — from bricklaying to blockwork — ensuring durable, precise, and long-lasting structures.',
    whyChooseUs: [
      'Skilled bricklayers and masons',
      'Durable brick, block, and mortar',
      'Precise, load-bearing structures',
      'Weather- and time-tested results',
    ],
    howItWorks: [
      { t: 'Contract Setup', d: 'Define structure and materials' },
      { t: 'Foundation', d: 'Layout and base preparation' },
      { t: 'Construction', d: 'Bricklaying and blockwork' },
      { t: 'Finishing', d: 'Pointing, sealing, and cleanup' },
    ],
  },
  {
    slug: 'flooring',
    title: 'Flooring Installation',
    img: 'images/img-be98.png',
    desc: 'We handle every step of flooring — from preparation to installation — ensuring smooth, durable, and elegant results.',
    whyChooseUs: [
      'Specialists in every floor type',
      'Level, moisture-safe substrates',
      'Seamless, durable installation',
      'Elegant, long-lasting finishes',
    ],
    howItWorks: [
      { t: 'Contract Setup', d: 'Choose flooring and finish' },
      { t: 'Preparation', d: 'Subfloor leveling and prep' },
      { t: 'Installation', d: 'Laying, fixing, and fitting' },
      { t: 'Finishing', d: 'Sealing, trims, and inspection' },
    ],
  },
  {
    slug: 'emergency',
    title: 'Emergency Construction Work',
    img: 'images/img-193d.png',
    desc: 'Fast response and repair of critical construction issues — to avoid project delays or safety risks.',
    whyChooseUs: [
      'Rapid response, on call',
      'Experienced emergency crews',
      'Safe, code-compliant repairs',
      'Minimized downtime and risk',
    ],
    howItWorks: [
      { t: 'Assessment', d: 'Rapid on-site evaluation' },
      { t: 'Stabilization', d: 'Make the site safe' },
      { t: 'Repair', d: 'Fix the critical issue' },
      { t: 'Handover', d: 'Verify and document' },
    ],
  },
];

/**
 * Seed / fallback projects. `spaceImg` is the image the design uses for the same
 * project in the Home "See the Spaces" grid.
 */
export const PROJECTS: Project[] = [
  {
    slug: 'rimi',
    title: 'Rimi Latvia',
    loc: 'RIMI Milgrāvis',
    img: 'images/proj-rimi.png',
    spaceImg: 'images/rimi.png',
    images: [
      'images/proj-rimi.png',
      'images/rimi.png',
      'images/svc-1.png',
      'images/img-9c88.png',
      'images/img-be98.png',
      'images/img-97b7.png',
      'images/img-193d.png',
      'images/home-interior.png',
    ],
    service: 'Drywall partition installation, interior finishing',
    country: 'Latvia',
    city: 'Rīga (Milgrāvis)',
    client: 'RIMI Latvia',
    start: '2021',
    end: '2022',
    status: 'Completed',
    official: { label: 'Rimi Latvia', url: 'https://www.rimi.lv' },
  },
  {
    slug: 'kuldiga',
    title: 'Kuldīga Park Development',
    loc: 'Kuldīgas parks',
    img: 'images/proj-kuldiga.png',
    spaceImg: 'images/img-771e.png',
    images: [
      'images/proj-kuldiga.png',
      'images/img-771e.png',
      'images/pv-hero.jpg',
      'images/svc-1.png',
      'images/img-9c88.png',
      'images/img-be98.png',
      'images/home-interior.png',
      'images/img-97b7.png',
    ],
    service: 'Gypsum partition wall installation, tiling, plastering',
    country: 'Latvia',
    city: 'Rīga (Āgenskalns)',
    client: 'Kuldīga Park Development',
    start: '2022',
    end: '2023',
    status: 'Completed',
    official: { label: 'Hipekon: Kuldīgas Parks', url: 'https://www.hipekon.lv' },
  },
  {
    slug: 'kepler',
    title: 'Kepler Club',
    loc: 'Kepler Club: Hotel & Lounge at RIX Airport',
    img: 'images/proj-kepler.png',
    spaceImg: 'images/img-aa46.png',
    images: [
      'images/proj-kepler.png',
      'images/img-aa46.png',
      'images/img-9c88.png',
      'images/home-interior.png',
      'images/svc-1.png',
      'images/img-be98.png',
      'images/img-193d.png',
      'images/img-97b7.png',
    ],
    service: 'Interior finishing, custom fit-out',
    country: 'Latvia',
    city: 'Rīga (RIX Airport)',
    client: 'Kepler',
    start: '2023',
    end: '2023',
    status: 'Completed',
    official: { label: 'Kepler Club', url: 'https://kepler.club' },
  },
  {
    slug: 'moho',
    title: 'MOHO Park Development',
    loc: 'MOHO PARK',
    img: 'images/proj-moho.png',
    spaceImg: 'images/img-39bf.png',
    images: [
      'images/proj-moho.png',
      'images/img-39bf.png',
      'images/home-hero.jpg',
      'images/svc-1.png',
      'images/img-9c88.png',
      'images/img-be98.png',
      'images/img-193d.png',
      'images/home-interior.png',
    ],
    service: 'Drywall, finishing, plastering',
    country: 'Latvia',
    city: 'Rīga',
    client: 'MOHO Park',
    start: '2023',
    end: '2024',
    status: 'Completed',
    official: { label: 'MOHO Park', url: 'https://mohopark.lv' },
  },
  {
    slug: 'daugavas',
    title: 'Daugava Athletics Hall',
    loc: 'Daugavas Vieglatlētikas Manēža',
    img: 'images/img-553f.png',
    spaceImg: 'images/img-553f.png',
    images: [
      'images/img-553f.png',
      'images/svc-1.png',
      'images/img-97b7.png',
      'images/img-9c88.png',
      'images/img-be98.png',
      'images/img-193d.png',
      'images/home-interior.png',
      'images/proj-moho.png',
    ],
    service: 'Structural finishing, drywall systems',
    country: 'Latvia',
    city: 'Rīga',
    client: 'Daugava Stadium',
    start: '2020',
    end: '2021',
    status: 'Completed',
    official: { label: 'Daugava Stadium', url: 'https://www.daugavasstadions.lv' },
  },
  {
    slug: 'sweden',
    title: 'Private Object in Sweden',
    // The Projects card and the Home spaces tile use different labels in the design.
    loc: 'Private Object, Sweden',
    img: 'images/img-575d.png',
    spaceImg: 'images/img-575d.png',
    images: [
      'images/img-575d.png',
      'images/img-5279.png',
      'images/img-97b7.png',
      'images/svc-1.png',
      'images/img-9c88.png',
      'images/img-be98.png',
      'images/home-interior.png',
      'images/img-193d.png',
    ],
    service: 'Wood construction, exterior & interior finishing',
    country: 'Sweden',
    city: '—',
    client: 'Private',
    start: '2022',
    end: '2023',
    status: 'Completed',
    official: { label: '', url: '' },
  },
];

/** Home "See the Spaces" labels — these differ from the Projects card labels. */
export const SPACE_LABELS: Record<string, string> = {
  rimi: 'RIMI Milgrāvis',
  kuldiga: 'Kuldīgas parks',
  kepler: 'Kepler Club: Hotel & Lounge at RIX Airport',
  moho: 'MOHO PARK',
  daugavas: 'Daugavas Vieglatlētikas Manēža',
  sweden: 'Private Object in Sweden',
};

/** Per-service gallery + video posters (service detail page). */
export const SVC_MEDIA: Record<string, { gallery: string[]; vids: { p: string; d: string }[] }> = {
  drywall: {
    gallery: ['images/svc-1.png', 'images/img-9c88.png', 'images/home-interior.png', 'images/img-be98.png'],
    vids: [{ p: 'images/svc-1.png', d: '1:48' }, { p: 'images/img-9c88.png', d: '2:31' }],
  },
  interior: {
    gallery: ['images/img-9c88.png', 'images/home-interior.png', 'images/img-be98.png', 'images/svc-1.png'],
    vids: [{ p: 'images/home-interior.png', d: '2:12' }, { p: 'images/img-be98.png', d: '1:36' }],
  },
  wood: {
    gallery: ['images/img-5279.png', 'images/img-575d.png', 'images/img-97b7.png'],
    vids: [{ p: 'images/img-5279.png', d: '3:04' }, { p: 'images/img-575d.png', d: '1:52' }],
  },
  masonry: {
    gallery: ['images/img-97b7.png', 'images/img-771e.png', 'images/img-193d.png'],
    vids: [{ p: 'images/img-97b7.png', d: '2:20' }, { p: 'images/img-771e.png', d: '1:41' }],
  },
  flooring: {
    gallery: ['images/img-be98.png', 'images/home-interior.png', 'images/svc-1.png', 'images/img-9c88.png'],
    vids: [{ p: 'images/img-be98.png', d: '1:29' }, { p: 'images/svc-1.png', d: '2:05' }],
  },
  emergency: {
    gallery: ['images/img-193d.png', 'images/img-97b7.png', 'images/svc-1.png'],
    vids: [{ p: 'images/img-193d.png', d: '0:58' }, { p: 'images/img-97b7.png', d: '1:17' }],
  },
};

/** Project video posters. The design hardcodes these two durations. */
export const PROJ_VIDS: Record<string, string[]> = {
  rimi: ['images/proj-rimi.png', 'images/rimi.png'],
  kuldiga: ['images/proj-kuldiga.png', 'images/img-771e.png'],
  kepler: ['images/proj-kepler.png', 'images/img-aa46.png'],
  moho: ['images/proj-moho.png', 'images/img-39bf.png'],
  daugavas: ['images/img-553f.png', 'images/svc-1.png'],
  sweden: ['images/img-575d.png', 'images/img-5279.png'],
};

export const PROJ_VID_DURATIONS = ['2:14', '1:33'];

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

/** Booking defaults from the design's `SC` object. */
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

/** Localize a service's title/desc by slug, exactly as the design's `locServices` does. */
export function localizeService(svc: Service, t: Dict): Service {
  const title = t[`svc_${svc.slug}_t` as keyof Dict];
  const desc = t[`svc_${svc.slug}_d` as keyof Dict];
  return { ...svc, title: title || svc.title, desc: desc || svc.desc };
}

export function serviceLongCopy(slug: string, t: Dict): string {
  return t[`svc_${slug}_long` as keyof Dict] || '';
}

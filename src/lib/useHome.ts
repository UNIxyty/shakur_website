import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { emptyL10n } from './db';
import type { HomeImageSection, HomePartnerItem, HomeSectionsContent, HomeText, L10n } from './db';

/**
 * Home-page content for the public site.
 *
 * Reads the postgres-owned home_public view (published sections only) with the
 * anon client and deep-merges it, section by section, over the static design
 * defaults. If Supabase is absent — or the query fails, e.g. a v2 database
 * without home_public — the page silently renders STATIC_HOME instead (one
 * console.warn, never a crash). en-fallback per field is the consumer's job
 * via pick().
 */

/** The design's homeCms defaults (ShakurAdminPanel.dc.html state, verbatim). */
export const STATIC_HOME: HomeSectionsContent = {
  hero: { image: 'images/home-hero.jpg' },
  partner: { image: 'images/home-interior.png' },
  cta: { image: 'images/cta-meeting.jpg' },
  text: {
    heroTitle: {
      en: 'Interior Finish Experts',
      lv: 'Iekšdarbu apdares eksperti',
      ru: 'Эксперты по внутренней отделке',
    },
    heroSub: {
      en: 'From drywall installation to tiling and painting — we deliver high-quality interior finishing with clear pricing, on-time completion, and a 5-year warranty.',
      lv: 'No ģipškartona montāžas līdz flīzēšanai un krāsošanai — augstas kvalitātes apdare ar skaidrām cenām un 5 gadu garantiju.',
      ru: 'От монтажа гипсокартона до плитки и покраски — качественная отделка с прозрачными ценами и 5-летней гарантией.',
    },
    partnerTitle: {
      en: 'Your Partner in Quality Interior Finishing',
      lv: 'Jūsu partneris kvalitatīvā apdarē',
      ru: 'Ваш партнёр в качественной отделке',
    },
    partnerItems: [
      {
        a: {
          en: 'Premium Interior Installation',
          lv: 'Augstākā līmeņa montāža',
          ru: 'Премиальная отделка',
        },
        b: {
          en: 'Our skilled team delivers flawless drywall, tiling, and finishing work with lasting quality.',
          lv: 'Mūsu komanda veic nevainojamu ģipškartona un apdares darbu ar noturīgu kvalitāti.',
          ru: 'Наша команда выполняет безупречную отделку с долговечным качеством.',
        },
      },
      {
        a: {
          en: '98% Journal Completion',
          lv: '98% žurnāla aizpildīšana',
          ru: '98% заполнение журнала',
        },
        b: {
          en: 'We maintain a 98% project-journal completion rate — full documentation, permits, and compliance records.',
          lv: 'Uzturam 98% projektu žurnāla aizpildīšanu — pilna dokumentācija un atbilstība.',
          ru: 'Поддерживаем 98% заполнение журнала — полная документация и соответствие.',
        },
      },
      {
        a: {
          en: 'Fast and Reliable Repairs',
          lv: 'Ātri un uzticami remonti',
          ru: 'Быстрый и надёжный ремонт',
        },
        b: {
          en: 'From minor fixes to major work — we restore interiors quickly, cleanly, and precisely.',
          lv: 'No maziem labojumiem līdz lieliem darbiem — ātri, tīri un precīzi.',
          ru: 'От мелкого ремонта до крупных работ — быстро, чисто и точно.',
        },
      },
      {
        a: {
          en: 'Stress-Free Interior Construction',
          lv: 'Bezrūpīga būvniecība',
          ru: 'Отделка без забот',
        },
        b: {
          en: 'From concept to delivery, we manage the whole process with precision and care.',
          lv: 'No idejas līdz nodošanai vadām visu procesu ar rūpību.',
          ru: 'От идеи до сдачи ведём весь процесс с вниманием.',
        },
      },
    ],
    ctaTitle: {
      en: 'Are you ready to discuss your renovation?',
      lv: 'Vai esat gatavs pārrunāt savu renovāciju?',
      ru: 'Готовы обсудить ваш ремонт?',
    },
    ctaSub: {
      en: 'Protect and transform your home with high-quality finishing and drywall services. From small repairs to complete renovations — we handle it all professionally. Get your free consultation today!',
      lv: 'Aizsargājiet un pārveidojiet savu māju ar augstas kvalitātes apdari. No maziem remontiem līdz pilnīgām renovācijām — darām visu profesionāli. Saņemiet bezmaksas konsultāciju!',
      ru: 'Защитите и преобразите свой дом с помощью качественной отделки. От мелкого ремонта до полной реновации — делаем всё профессионально. Получите бесплатную консультацию!',
    },
    ctaBtn: {
      en: 'Request a Consultation',
      lv: 'Pieteikt konsultāciju',
      ru: 'Заказать консультацию',
    },
  },
};

export interface HomeData {
  content: HomeSectionsContent;
  source: 'supabase' | 'static';
}

/* ---------------------------------------------------------------------------
 * Shape guards + per-section deep merge. The published JSON is admin-written,
 * so every field is validated before it displaces a static default.
 * ------------------------------------------------------------------------- */

function isL10nish(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (['en', 'lv', 'ru'] as const).some((k) => typeof o[k] === 'string' && o[k] !== '');
}

/** Normalize to a full L10n (missing languages become '' → pick() falls back). */
function asL10n(v: unknown, fallback: L10n): L10n {
  if (!isL10nish(v)) return fallback;
  const o = v as Record<string, unknown>;
  const out = emptyL10n();
  for (const k of ['en', 'lv', 'ru'] as const) {
    if (typeof o[k] === 'string') out[k] = o[k] as string;
  }
  return out;
}

function mergeImage(v: unknown, fallback: HomeImageSection): HomeImageSection {
  const image = (v as { image?: unknown } | null | undefined)?.image;
  return typeof image === 'string' && image !== '' ? { image } : fallback;
}

function mergeText(v: unknown, fallback: HomeText): HomeText {
  if (!v || typeof v !== 'object') return fallback;
  const o = v as Record<string, unknown>;

  let partnerItems: HomePartnerItem[] = fallback.partnerItems;
  if (Array.isArray(o.partnerItems)) {
    const items = (o.partnerItems as unknown[])
      .filter((it): it is { a?: unknown; b?: unknown } => !!it && typeof it === 'object')
      .filter((it) => isL10nish(it.a) || isL10nish(it.b))
      .map((it) => ({ a: asL10n(it.a, emptyL10n()), b: asL10n(it.b, emptyL10n()) }));
    if (items.length) partnerItems = items;
  }

  return {
    heroTitle: asL10n(o.heroTitle, fallback.heroTitle),
    heroSub: asL10n(o.heroSub, fallback.heroSub),
    partnerTitle: asL10n(o.partnerTitle, fallback.partnerTitle),
    partnerItems,
    ctaTitle: asL10n(o.ctaTitle, fallback.ctaTitle),
    ctaSub: asL10n(o.ctaSub, fallback.ctaSub),
    ctaBtn: asL10n(o.ctaBtn, fallback.ctaBtn),
  };
}

function mergeHome(rows: { section: string; published: unknown }[]): HomeSectionsContent {
  const by = new Map(rows.map((r) => [r.section, r.published]));
  return {
    hero: mergeImage(by.get('hero'), STATIC_HOME.hero),
    partner: mergeImage(by.get('partner'), STATIC_HOME.partner),
    cta: mergeImage(by.get('cta'), STATIC_HOME.cta),
    text: mergeText(by.get('text'), STATIC_HOME.text),
  };
}

export function useHome(): HomeData {
  const [data, setData] = useState<HomeData>({ content: STATIC_HOME, source: 'static' });

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      const { data: rows, error } = await supabase.from('home_public').select('section, published');

      if (cancelled) return;

      if (error) {
        // A v2 database (before supabase/migrate-v3.sql) has no home_public —
        // that must never crash the Home page; render the static defaults.
        console.warn('[shakur] home_public query failed, using static home content:', error.message);
        return;
      }
      if (rows?.length) {
        setData({ content: mergeHome(rows), source: 'supabase' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

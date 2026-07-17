import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { LOGOS_ROW1, LOGOS_ROW2 } from '../data';
import type { LogoItem } from '../data';

/**
 * Site chrome (v4, extended v5) — the home logo carousel's content and speed
 * plus the v5 legibility-blur flags, one anon fetch shared by the call sites:
 * site_logos (both rows), site_settings.marquee_speed_s and
 * site_settings.blur_sections.
 *
 * `speedS` is SECONDS PER LOOP for row 1 (design: 30s row 1 / 25s row 2);
 * callers derive row 2 as speedS * 25 / 30 to keep the designed ratio.
 *
 * `blur` mirrors site_settings.blur_sections ({"hero","projects"}); defaults
 * are BOTH OFF — a pre-migrate-v5 database (missing column), any query error,
 * or unconfigured Supabase leaves the public page exactly as designed. The
 * last DB-confirmed value is cached in localStorage so repeat paints don't
 * flash the wrong panel state.
 *
 * Fallback stance mirrors useHome: Supabase absent, query error (e.g. a
 * pre-migrate-v4 database without site_logos), or an empty table → the static
 * LOGOS_ROW1/2 lists and 30s. Never a crash, one console.warn.
 */

export interface SiteBlur {
  hero: boolean;
  projects: boolean;
}

export interface SiteChrome {
  logosRow1: LogoItem[];
  logosRow2: LogoItem[];
  speedS: number;
  blur: SiteBlur;
  source: 'supabase' | 'static';
}

/** v5 contract: both panels default OFF (the public design has no hero panel). */
export const BLUR_DEFAULTS: SiteBlur = { hero: false, projects: false };

export const BLUR_CACHE_KEY = 'shakur_site_blur_v1';

/** Coerces the blur_sections jsonb (or cached JSON) into a safe SiteBlur. */
export function normalizeBlur(raw: unknown): SiteBlur {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...BLUR_DEFAULTS };
  const o = raw as Record<string, unknown>;
  return {
    hero: typeof o.hero === 'boolean' ? o.hero : BLUR_DEFAULTS.hero,
    projects: typeof o.projects === 'boolean' ? o.projects : BLUR_DEFAULTS.projects,
  };
}

export function readBlurCache(): SiteBlur {
  try {
    const raw = localStorage.getItem(BLUR_CACHE_KEY);
    if (!raw) return { ...BLUR_DEFAULTS };
    return normalizeBlur(JSON.parse(raw));
  } catch {
    return { ...BLUR_DEFAULTS };
  }
}

export function writeBlurCache(blur: SiteBlur): void {
  try {
    localStorage.setItem(BLUR_CACHE_KEY, JSON.stringify(blur));
  } catch {
    /* private mode etc. — cache is best-effort */
  }
}

const STATIC_CHROME: Omit<SiteChrome, 'blur'> = {
  logosRow1: LOGOS_ROW1,
  logosRow2: LOGOS_ROW2,
  speedS: 30,
  source: 'static',
};

type LogoRow = { row: number; name: string; img: string; sort_order: number };

export function useSiteChrome(): SiteChrome {
  const [chrome, setChrome] = useState<SiteChrome>(() => ({
    ...STATIC_CHROME,
    blur: readBlurCache(),
  }));

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    void (async () => {
      const [logosRes, settingsRes, blurRes] = await Promise.all([
        client
          .from('site_logos')
          .select('row, name, img, sort_order')
          .order('row', { ascending: true })
          .order('sort_order', { ascending: true }),
        client.from('site_settings').select('marquee_speed_s').eq('id', 1).maybeSingle(),
        // Separate query: a pre-migrate-v5 database has no blur_sections column
        // and must not take the marquee speed down with it.
        client.from('site_settings').select('blur_sections').eq('id', 1).maybeSingle(),
      ]);
      if (cancelled) return;

      // v5 blur flags — applied regardless of how the logo queries fared.
      let blur: SiteBlur | null = null;
      if (!blurRes.error) {
        blur = normalizeBlur(
          (blurRes.data as { blur_sections?: unknown } | null)?.blur_sections
        );
        writeBlurCache(blur);
      } else {
        // Missing column pre-migrate-v5 (or transient failure) — defaults stand.
        console.warn(
          '[shakur] blur_sections query failed, using defaults:',
          blurRes.error.message
        );
      }

      const rows = (logosRes.data ?? []) as LogoRow[];
      const logosOk = !logosRes.error && rows.length > 0;
      if (logosRes.error) {
        // Pre-v4 database or nothing seeded yet — the static design lists.
        console.warn(
          '[shakur] site_logos query failed, using static logos:',
          logosRes.error.message
        );
      }
      if (!logosOk && !blur) return;

      const toItem = (r: LogoRow): LogoItem => ({ name: r.name, img: r.img });
      const speed = (settingsRes.data as { marquee_speed_s?: unknown } | null)?.marquee_speed_s;
      setChrome((prev) => ({
        ...(logosOk
          ? {
              logosRow1: rows.filter((r) => r.row === 1).map(toItem),
              logosRow2: rows.filter((r) => r.row === 2).map(toItem),
              speedS:
                !settingsRes.error && typeof speed === 'number' && speed >= 5 && speed <= 120
                  ? speed
                  : 30,
              source: 'supabase' as const,
            }
          : {
              logosRow1: prev.logosRow1,
              logosRow2: prev.logosRow2,
              speedS: prev.speedS,
              source: prev.source,
            }),
        blur: blur ?? prev.blur,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return chrome;
}

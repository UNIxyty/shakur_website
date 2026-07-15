import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { LOGOS_ROW1, LOGOS_ROW2 } from '../data';
import type { LogoItem } from '../data';

/**
 * Site chrome (v4) — the home logo carousel's content and speed, one anon
 * fetch shared by the Marquee call sites: site_logos (both rows) plus
 * site_settings.marquee_speed_s.
 *
 * `speedS` is SECONDS PER LOOP for row 1 (design: 30s row 1 / 25s row 2);
 * callers derive row 2 as speedS * 25 / 30 to keep the designed ratio.
 *
 * Fallback stance mirrors useHome: Supabase absent, query error (e.g. a
 * pre-migrate-v4 database without site_logos), or an empty table → the static
 * LOGOS_ROW1/2 lists and 30s. Never a crash, one console.warn.
 */

export interface SiteChrome {
  logosRow1: LogoItem[];
  logosRow2: LogoItem[];
  speedS: number;
  source: 'supabase' | 'static';
}

const STATIC_CHROME: SiteChrome = {
  logosRow1: LOGOS_ROW1,
  logosRow2: LOGOS_ROW2,
  speedS: 30,
  source: 'static',
};

type LogoRow = { row: number; name: string; img: string; sort_order: number };

export function useSiteChrome(): SiteChrome {
  const [chrome, setChrome] = useState<SiteChrome>(STATIC_CHROME);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    void (async () => {
      const [logosRes, settingsRes] = await Promise.all([
        client
          .from('site_logos')
          .select('row, name, img, sort_order')
          .order('row', { ascending: true })
          .order('sort_order', { ascending: true }),
        client.from('site_settings').select('marquee_speed_s').eq('id', 1).maybeSingle(),
      ]);
      if (cancelled) return;

      const rows = (logosRes.data ?? []) as LogoRow[];
      if (logosRes.error || rows.length === 0) {
        // Pre-v4 database or nothing seeded yet — the static design lists.
        if (logosRes.error) {
          console.warn(
            '[shakur] site_logos query failed, using static logos:',
            logosRes.error.message
          );
        }
        return;
      }

      const toItem = (r: LogoRow): LogoItem => ({ name: r.name, img: r.img });
      const speed = (settingsRes.data as { marquee_speed_s?: unknown } | null)?.marquee_speed_s;
      setChrome({
        logosRow1: rows.filter((r) => r.row === 1).map(toItem),
        logosRow2: rows.filter((r) => r.row === 2).map(toItem),
        speedS:
          !settingsRes.error && typeof speed === 'number' && speed >= 5 && speed <= 120
            ? speed
            : 30,
        source: 'supabase',
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return chrome;
}

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { LANGS, type Lang } from '../i18n';

/**
 * Runtime site copy (v5) — published overrides from the `site_texts_public`
 * view, merged over the strings.json file defaults by LangProvider.
 *
 * Boot order: the localStorage cache paints instantly (no flash of default
 * copy on repeat visits), then one anon fetch refreshes state + cache.
 *
 * Fallback stance mirrors useSiteStatus/useSiteChrome: Supabase absent, a
 * pre-migrate-v5 database (missing view → 42P01/PGRST205), or any query error
 * → file defaults, one console.warn, never a crash. strings.json remains the
 * seed/fallback for every key.
 */

export type TextOverrides = Record<string, Partial<Record<Lang, string>>>;

export const TEXTS_CACHE_KEY = 'shakur_site_texts_v1';

/** Coerces unknown JSON into the override shape; anything malformed is dropped. */
function normalize(raw: unknown): TextOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: TextOverrides = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry: Partial<Record<Lang, string>> = {};
    let any = false;
    for (const l of LANGS) {
      const s = (value as Record<string, unknown>)[l];
      if (typeof s === 'string') {
        entry[l] = s;
        any = true;
      }
    }
    if (any) out[key] = entry;
  }
  return out;
}

function readCache(): TextOverrides {
  try {
    const raw = localStorage.getItem(TEXTS_CACHE_KEY);
    if (!raw) return {};
    return normalize(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeCache(overrides: TextOverrides): void {
  try {
    localStorage.setItem(TEXTS_CACHE_KEY, JSON.stringify(overrides));
  } catch {
    /* private mode etc. — cache is best-effort */
  }
}

export function useSiteTexts(): TextOverrides {
  const [overrides, setOverrides] = useState<TextOverrides>(readCache);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await client.from('site_texts_public').select('key, published');
        if (cancelled) return;
        if (error) {
          // Pre-migrate-v5 database (missing view) or transient failure — the
          // file defaults (or the last cached overrides) stay in effect.
          console.warn(
            '[shakur] site_texts_public unavailable, using file defaults:',
            error.message
          );
          return;
        }
        const next: TextOverrides = {};
        for (const row of (data ?? []) as { key?: unknown; published?: unknown }[]) {
          if (typeof row.key !== 'string') continue;
          const entry = normalize({ [row.key]: row.published })[row.key];
          if (entry) next[row.key] = entry;
        }
        setOverrides(next);
        writeCache(next);
      } catch (err) {
        if (!cancelled) {
          console.warn('[shakur] site texts fetch failed, using file defaults:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return overrides;
}

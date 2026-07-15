import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Runtime site mode (v4) — reads site_settings.status with the anon client so
 * the admin can flip Live / Coming soon without a rebuild.
 *
 * Resolution order:
 *   1. `shakur_site_mode=live` cookie → 'live' (migration escape hatch).
 *   2. A Supabase session → 'live' (admins always see the real site).
 *   3. site_settings.status (anon select). Pre-migration databases have no
 *      status column — any error/missing value falls back to VITE_SITE_MODE.
 *
 * The last DB-confirmed value is cached in localStorage('shakur_site_status')
 * so repeat visits paint instantly instead of waiting on the network; the
 * fresh fetch then corrects it if the admin flipped the switch meanwhile.
 * Returns undefined while first resolving (render nothing — no flash).
 */

export type SiteStatus = 'live' | 'coming_soon';

const CACHE_KEY = 'shakur_site_status';

function cookieBypass(): boolean {
  return document.cookie.includes('shakur_site_mode=live');
}

function envFallback(): SiteStatus {
  return import.meta.env.VITE_SITE_MODE === 'coming_soon' ? 'coming_soon' : 'live';
}

function cached(): SiteStatus | undefined {
  try {
    const v = localStorage.getItem(CACHE_KEY);
    return v === 'live' || v === 'coming_soon' ? v : undefined;
  } catch {
    return undefined;
  }
}

export function useSiteStatus(): SiteStatus | undefined {
  const [status, setStatus] = useState<SiteStatus | undefined>(() => {
    if (cookieBypass()) return 'live';
    if (!supabase) return envFallback();
    return cached(); // instant repeat paint; undefined on the very first visit
  });

  useEffect(() => {
    if (!supabase || cookieBypass()) return;
    const client = supabase;
    let cancelled = false;
    let signedIn = false;

    const fetchStatus = async () => {
      const { data, error } = await client
        .from('site_settings')
        .select('status')
        .eq('id', 1)
        .maybeSingle();
      if (cancelled || signedIn) return;
      const value = (data as { status?: unknown } | null)?.status;
      if (!error && (value === 'live' || value === 'coming_soon')) {
        try {
          localStorage.setItem(CACHE_KEY, value);
        } catch {
          /* private mode etc. — cache is best-effort */
        }
        setStatus(value);
      } else {
        // Missing column (pre-migrate-v4) or transient failure: env fallback,
        // and don't poison the cache with a guess.
        setStatus(envFallback());
      }
    };

    void client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        signedIn = true;
        setStatus('live');
      } else {
        void fetchStatus();
      }
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) {
        signedIn = true;
        setStatus('live');
      } else {
        signedIn = false;
        void fetchStatus();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return status;
}

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from './supabase';

/**
 * Page-view analytics (v6) — one fire-and-forget insert into `page_views` per
 * public route change. Privacy by construction: no cookies, no IPs, no user
 * agents; the visit id is a random uuid scoped to sessionStorage (gone when
 * the tab closes), the referrer is stored as an external HOSTNAME only, and
 * the anon key can only INSERT (RLS: no read-back). Pre-migrate-v6 databases
 * just reject the insert — swallowed silently, the visitor never notices.
 */

const VISIT_KEY = 'shakur_visit_v1';

function visitId(): string {
  try {
    let id = sessionStorage.getItem(VISIT_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      sessionStorage.setItem(VISIT_KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode): still count the view, uncorrelated.
    return 'v-anonymous';
  }
}

/** External referrer hostname, or null for direct/internal navigation. */
function externalReferrer(): string | null {
  try {
    const ref = document.referrer;
    if (!ref) return null;
    const u = new URL(ref);
    return u.origin === window.location.origin ? null : u.hostname.slice(0, 200);
  } catch {
    return null;
  }
}

/** Admins browsing their own site are not visitors — checked once per load. */
let adminCheck: Promise<boolean> | null = null;
function isAdminBrowser(): Promise<boolean> {
  if (!supabase) return Promise.resolve(false);
  if (!adminCheck) {
    adminCheck = supabase.auth
      .getSession()
      .then((r) => Boolean(r.data.session))
      .catch(() => false);
  }
  return adminCheck;
}

/** Collapse unbounded-cardinality routes (booking tokens) into one bucket. */
function normalizePath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  return /^\/booking\//.test(path) ? '/booking' : path;
}

let lastLogged = ''; // StrictMode double-effect guard

export default function TrackPageViews() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!supabase || import.meta.env.DEV) return;
    const client = supabase;
    const path = normalizePath(pathname);
    if (lastLogged === path) return;
    lastLogged = path;

    void (async () => {
      if (await isAdminBrowser()) return;
      await client
        .from('page_views')
        .insert({
          path,
          referrer: externalReferrer(),
          lang: document.documentElement.lang || null,
          device: window.innerWidth < 768 ? 'mobile' : 'desktop',
          visit_id: visitId(),
        })
        .then(() => {
          /* errors (e.g. pre-migration missing table) are intentionally silent */
        });
    })();
  }, [pathname]);

  return null;
}

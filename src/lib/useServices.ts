import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type { ServiceRow } from './db';

/**
 * Services for the public site — same live-only pattern as useProjects (v5):
 * published rows ordered by sort_order straight from Supabase, [] while
 * loading, [] on error / v1-shape rows / unconfigured Supabase. No static
 * fallback content, ever — empty means the designed empty states render.
 */
export function useServices() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [source, setSource] = useState<'static' | 'supabase'>('static');

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('published', true)
        .order('sort_order', { ascending: true });

      if (cancelled) return;

      if (error) {
        console.warn('[shakur] services query failed — rendering no services:', error.message);
      } else {
        // Guard against a half-migrated database (see useProjects). An EMPTY
        // result is still live data — the home page shows its designed
        // "No services yet" state.
        const rows = data ?? [];
        const v2 = rows.every(
          (r) => r && typeof r.i18n === 'object' && r.i18n !== null && Array.isArray(r.media)
        );
        if (v2) {
          setServices(rows as ServiceRow[]);
          setSource('supabase');
        } else {
          console.warn(
            '[shakur] services table has an unexpected shape — run supabase/migrate-v2.sql; rendering no services'
          );
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { services, loading, source };
}

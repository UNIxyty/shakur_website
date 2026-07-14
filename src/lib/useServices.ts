import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type { ServiceRow } from './db';
import { FALLBACK_SERVICES } from '../data';

/**
 * Services for the public site — same static-fallback pattern as useProjects:
 * published rows ordered by sort_order, or the design's static list when
 * Supabase is unconfigured / errors / is empty.
 */
export function useServices() {
  const [services, setServices] = useState<ServiceRow[]>(FALLBACK_SERVICES);
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
        console.error('[shakur] services query failed, using static content:', error.message);
      } else if (data?.length) {
        // Guard against a half-migrated database (see useProjects).
        const v2 = data.every(
          (r) => r && typeof r.i18n === 'object' && r.i18n !== null && Array.isArray(r.media)
        );
        if (v2) {
          setServices(data as ServiceRow[]);
          setSource('supabase');
        } else {
          console.warn(
            '[shakur] services table has an unexpected shape — run supabase/migrate-v2.sql; using static content'
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

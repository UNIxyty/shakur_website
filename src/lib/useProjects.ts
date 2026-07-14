import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type { ProjectRow } from './db';
import { FALLBACK_PROJECTS } from '../data';

/**
 * Portfolio projects for the public site.
 *
 * Reads published rows from Supabase when configured. If Supabase is absent — or
 * the query fails, or the table is empty — we fall back to the design's static
 * list so the page never renders an empty grid. `source` lets callers tell which
 * happened.
 */
function isV2Row(r: unknown): boolean {
  const row = r as { i18n?: unknown; media?: unknown };
  return !!row && typeof row.i18n === 'object' && row.i18n !== null && Array.isArray(row.media);
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>(FALLBACK_PROJECTS);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [source, setSource] = useState<'static' | 'supabase'>('static');

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('published', true)
        .order('sort_order', { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error('[shakur] projects query failed, using static content:', error.message);
      } else if (data?.length) {
        // A v1 database (before supabase/migrate-v2.sql) returns rows without
        // i18n/media — treat those as unusable rather than crashing the pages.
        if (data.every(isV2Row)) {
          setProjects(data as ProjectRow[]);
          setSource('supabase');
        } else {
          console.warn(
            '[shakur] projects table has the old v1 shape — run supabase/migrate-v2.sql; using static content'
          );
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { projects, loading, source };
}

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type { ProjectRow } from './db';

/**
 * Portfolio projects for the public site — live Supabase rows only (v5: the
 * static fallback list is gone; the DB is the single source of truth).
 *
 * While the query is in flight `projects` is [] and `loading` is true —
 * consumers gate their grids/empty states on `loading` so nothing flashes.
 * A query error or a pre-migration (v1-shape) table degrades to an empty
 * list with a console.warn. When Supabase isn't configured at all the hook
 * settles immediately on [] with loading=false.
 *
 * `source` is kept for compatibility: 'supabase' once live rows (even zero
 * of them) have loaded, 'static' otherwise (unconfigured or failed → empty).
 */
function isV2Row(r: unknown): boolean {
  const row = r as { i18n?: unknown; media?: unknown };
  return !!row && typeof row.i18n === 'object' && row.i18n !== null && Array.isArray(row.media);
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
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
        console.warn('[shakur] projects query failed — rendering no projects:', error.message);
      } else {
        // A v1 database (before supabase/migrate-v2.sql) returns rows without
        // i18n/media — treat those as unusable rather than crashing the pages.
        // An EMPTY result is still live data — the home page shows its designed
        // "No projects yet" state.
        const rows = data ?? [];
        if (rows.every(isV2Row)) {
          setProjects(rows as ProjectRow[]);
          setSource('supabase');
        } else {
          console.warn(
            '[shakur] projects table has the old v1 shape — run supabase/migrate-v2.sql; rendering no projects'
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

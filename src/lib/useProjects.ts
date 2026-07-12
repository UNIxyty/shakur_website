import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, type ProjectRow } from './supabase';
import { PROJECTS, type Project } from '../data';

/** The public Facts panel shows only the year, matching the design's `yr()` helper. */
const year = (iso: string) => (iso ? String(iso).slice(0, 4) : '—');

/** Fall back to the URL's hostname when no display label was set. */
function officialLabel(row: ProjectRow): string {
  if (row.official_label) return row.official_label;
  if (!row.official_url) return '';
  try {
    return new URL(row.official_url).hostname.replace(/^www\./, '');
  } catch {
    return row.official_url;
  }
}

function rowToProject(r: ProjectRow): Project {
  return {
    slug: r.slug,
    title: r.title,
    loc: r.loc || r.city,
    img: r.img,
    spaceImg: r.space_img || r.img,
    images: r.images?.length ? r.images : [r.img],
    service: r.service,
    country: r.country,
    city: r.city,
    client: r.client,
    start: year(r.start_date),
    end: year(r.end_date),
    status: r.status,
    official: { label: officialLabel(r), url: r.official_url || '' },
  };
}

/**
 * Portfolio projects for the public site.
 *
 * Reads from Supabase when configured. If Supabase is absent — or the query fails,
 * or the table is empty — we fall back to the design's static list so the page never
 * renders an empty grid. `source` lets callers tell which happened.
 */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
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
        setProjects((data as ProjectRow[]).map(rowToProject));
        setSource('supabase');
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { projects, loading, source };
}

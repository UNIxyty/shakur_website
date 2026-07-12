import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase is optional. With no env vars the public site still renders — it falls
 * back to the static design content (see useProjects). Only /admin hard-requires it.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

/** The three states the admin design allows. */
export const STATUSES = ['In Progress', 'Completed', 'Paused'] as const;
export type ProjectStatus = (typeof STATUSES)[number];

/** Service options in the admin drawer's <select>. */
export const SERVICE_OPTIONS = [
  'Drywall',
  'Interior Finishing',
  'Wood Construction',
  'Masonry',
  'Flooring',
  'Emergency',
] as const;

/** Row shape of the `projects` table. */
export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  loc: string;
  img: string;
  space_img: string | null;
  images: string[];
  short_desc: string;
  full_desc: string;
  service: string;
  country: string;
  city: string;
  client: string;
  /** ISO 'YYYY-MM-DD', or '' when unset. The public site shows only the year. */
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  official_label: string | null;
  official_url: string | null;
  sort_order: number;
  published: boolean;
  created_at?: string;
  updated_at?: string;
};

/** Fields the admin form writes. `id`/timestamps are managed by Postgres. */
export type ProjectInput = Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>;

/** Route-safe slug derived from a title. Diacritics are folded (Rīga -> riga). */
export function slugify(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'project'
  );
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ProjectRow, ServiceRow } from './db';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase is optional. With no env vars the public site still renders — it falls
 * back to the static design content (see useProjects/useServices). Only /admin
 * hard-requires it.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

// Row types live in db.ts; re-exported so existing imports keep working.
export type {
  Lang,
  L10n,
  MediaItem,
  Capability,
  ProjectRow,
  ServiceRow,
  MeetingRow,
  Availability,
  SiteSettingsRow,
} from './db';
export { emptyL10n, pick, mediaCounts } from './db';

/** The three project-phase states the admin design allows. */
export const STATUSES = ['In Progress', 'Completed', 'Paused'] as const;
export type ProjectStatus = (typeof STATUSES)[number];

/** Meeting lifecycle states. */
export const MEETING_STATUSES = ['scheduled', 'completed', 'canceled'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

/** Service options in the admin project drawer's dropdown. */
export const SERVICE_OPTIONS = [
  'Drywall',
  'Interior Finishing',
  'Wood Construction',
  'Masonry',
  'Flooring',
  'Emergency',
] as const;

/** Service categories (filter chips on the public Services page + admin drawer). */
export const CATEGORIES = ['Construction', 'Finishing', 'Support'] as const;
export type ServiceCategory = (typeof CATEGORIES)[number];

/** Fields the admin form writes. `id`/timestamps are managed by Postgres. */
export type ProjectInput = Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>;
export type ServiceInput = Omit<ServiceRow, 'id' | 'created_at' | 'updated_at'>;

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

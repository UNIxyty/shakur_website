-- SHAKUR — v4 → v5 in-place migration for an EXISTING deployed database.
-- Re-runnable: every step is guarded (IF NOT EXISTS / CREATE OR REPLACE /
-- DROP POLICY IF EXISTS). Fresh installs should use supabase/schema.sql
-- instead (it already contains everything below). Run AFTER
-- supabase/migrate-v4.sql on a v3 database.
--
-- What it adds:
--   1. site_texts — the editable i18n store behind the admin "Website text"
--      manager. Each row overrides one flat i18n key from
--      src/i18n/strings.json (which remains the seed/fallback: keys with no
--      row, or with a null published value, keep the file's copy).
--        * published jsonb {en,lv,ru} — what the public site renders.
--        * draft     jsonb {en,lv,ru} — admin-only work in progress.
--      The public site reads through the site_texts_public view (published
--      only), the same pattern as home_public: the table itself has NO anon
--      policy, so drafts never leave the admin.
--   2. site_settings.blur_sections — the "Blur panel behind text" toggles
--      (Website text ▸ Hero / Projects showcase). jsonb so future sections
--      need no schema change. Defaults: both off — the public design shows
--      no panel until the admin turns one on.

-- ===========================================================================
-- 1. site_texts — editable website copy (EN/LV/RU per key)
-- ===========================================================================
create table if not exists public.site_texts (
  key        text primary key,   -- flat i18n leaf key, e.g. 'hero_title'
  published  jsonb,              -- {en,lv,ru}; null = never published
  draft      jsonb,              -- {en,lv,ru}; null = no pending draft
  updated_at timestamptz not null default now()
);

drop trigger if exists site_texts_set_updated_at on public.site_texts;
create trigger site_texts_set_updated_at
  before update on public.site_texts
  for each row execute function public.set_updated_at();

alter table public.site_texts enable row level security;

-- Admin-only on the table (drafts are not public). The anon-facing surface
-- is the view below.
drop policy if exists "authenticated read site texts" on public.site_texts;
create policy "authenticated read site texts"
  on public.site_texts for select
  to authenticated
  using (true);

drop policy if exists "authenticated insert site texts" on public.site_texts;
create policy "authenticated insert site texts"
  on public.site_texts for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update site texts" on public.site_texts;
create policy "authenticated update site texts"
  on public.site_texts for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated delete site texts" on public.site_texts;
create policy "authenticated delete site texts"
  on public.site_texts for delete
  to authenticated
  using (true);

-- Public read surface: published values only (home_public pattern).
create or replace view public.site_texts_public as
  select key, published
  from public.site_texts
  where published is not null;

grant select on public.site_texts_public to anon, authenticated;

-- ===========================================================================
-- 2. site_settings.blur_sections — legibility backdrops behind text
-- ===========================================================================
alter table public.site_settings
  add column if not exists blur_sections jsonb not null
    default '{"hero": false, "projects": false}'::jsonb;

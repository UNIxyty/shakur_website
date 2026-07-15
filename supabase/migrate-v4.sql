-- SHAKUR — v3 → v4 in-place migration for an EXISTING deployed database.
-- Re-runnable: every step is guarded (IF EXISTS / IF NOT EXISTS / seed-if-empty).
-- Fresh installs should use supabase/schema.sql instead (it already contains
-- everything below). Run AFTER supabase/migrate-v3.sql on a v2 database.
--
-- What it adds:
--   1. site_settings.status — runtime site mode ('live' | 'coming_soon'),
--      replacing the build-time-only VITE_SITE_MODE flag.
--   2. site_settings.marquee_speed_s — home logo-carousel speed, seconds per
--      loop for row 1 (row 2 keeps the designed 25/30 ratio client-side).
--   3. site_logos — the home marquee logos, managed in Settings ▸ Site
--      settings (anon-readable; writes require the authenticated admin),
--      seeded from the static LOGOS_ROW1/LOGOS_ROW2 lists in src/data.ts.
--   4. media_assets.kind + poster_path — the v4 video pipeline: POST
--      /api/media now also accepts video (mp4/mov/webm, ≤512 MB), transcodes
--      to h264+aac mp4 with +faststart and stores an auto-generated jpg
--      poster ('/media/<uuid>.jpg'; null for images).

create extension if not exists "pgcrypto";

-- ===========================================================================
-- 1 + 2. site_settings: runtime status + marquee speed
-- ===========================================================================
alter table public.site_settings
  add column if not exists status text not null default 'live'
    check (status in ('live', 'coming_soon')),
  add column if not exists marquee_speed_s integer not null default 30
    check (marquee_speed_s between 5 and 120);

-- ===========================================================================
-- 3. site_logos — home marquee logos ("Trusted by" row 1 / "Working with"
-- row 2). `img` is '/media/<file>' for uploads or an images/... preset path.
-- ===========================================================================
create table if not exists public.site_logos (
  id         uuid primary key default gen_random_uuid(),
  "row"      smallint not null check ("row" in (1, 2)),  -- ROW is reserved; quoted
  name       text     not null default '',
  img        text     not null,                -- '/media/<file>' or https URL
  sort_order integer  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists site_logos_row_sort_idx
  on public.site_logos ("row", sort_order);

alter table public.site_logos enable row level security;

-- RLS: anon + authenticated SELECT (the public marquee reads them);
-- authenticated ALL (the admin manages them). Same style as site_settings.
drop policy if exists "public read site logos" on public.site_logos;
create policy "public read site logos"
  on public.site_logos for select
  to anon, authenticated
  using (true);

drop policy if exists "authenticated insert site logos" on public.site_logos;
create policy "authenticated insert site logos"
  on public.site_logos for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update site logos" on public.site_logos;
create policy "authenticated update site logos"
  on public.site_logos for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated delete site logos" on public.site_logos;
create policy "authenticated delete site logos"
  on public.site_logos for delete
  to authenticated
  using (true);

-- ===========================================================================
-- Seed: the static LOGOS_ROW1 / LOGOS_ROW2 lists from src/data.ts. Only when
-- the table is empty (uuid PKs — ON CONFLICT can't dedupe), so re-running
-- never duplicates and never resurrects logos the admin has deleted.
-- ===========================================================================
insert into public.site_logos ("row", name, img, sort_order)
select s."row", s.name, s.img, s.sort_order
from (values
  (1, 'Mapri',            'images/logo-trust-1.png', 0),
  (1, 'Ekoteh',           'images/logo-trust-2.png', 1),
  (1, 'Angern',           'images/logo-trust-3.png', 2),
  (1, 'MGS',              'images/logo-trust-4.png', 3),
  (1, 'Partner',          'images/logo-trust-5.png', 4),
  (1, 'Asmetal',          'images/logo-trust-6.png', 5),
  (2, 'Mitt & Perlebach', 'images/logo-def-1.png',   0),
  (2, 'Lidl',             'images/logo-def-2.png',   1),
  (2, 'Jysk',             'images/logo-def-3.png',   2),
  (2, 'Kuldigas Parks',   'images/logo-def-4.png',   3),
  (2, 'Kepler',           'images/logo-def-5.png',   4)
) as s("row", name, img, sort_order)
where not exists (select 1 from public.site_logos);

-- ===========================================================================
-- 4. media_assets: video pipeline columns
-- ===========================================================================
alter table public.media_assets
  add column if not exists kind text not null default 'image'
    check (kind in ('image', 'video')),
  add column if not exists poster_path text;

-- ---------------------------------------------------------------------------
-- OPTIONAL: the runtime status defaults to 'live'. If your site is currently
-- hidden behind VITE_SITE_MODE=coming_soon and should STAY hidden after this
-- migration (the runtime value now wins), uncomment the next line:
-- update public.site_settings set status = 'coming_soon' where id = 1;
-- ---------------------------------------------------------------------------

-- SHAKUR — portfolio projects schema.
-- Run in the Supabase SQL editor, or: psql "$DATABASE_URL" -f supabase/schema.sql
--
-- Column set follows the admin design (ShakurAdmin.dc.html): cover image, an image
-- gallery, short/full description, service, ISO start/end dates, country/city, client,
-- status, and an official URL. `slug`, `space_img`, `sort_order` and `published` are
-- additionally required by the public site and are managed outside the admin form.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id             uuid primary key default gen_random_uuid(),
  -- Route key for /project/:slug. Derived from the title on create, then held stable
  -- so that editing a title never breaks an existing public URL.
  slug           text        not null unique,
  title          text        not null,
  -- Location chip on the public cards ("RIMI Milgrāvis") — deliberately distinct from
  -- `city` ("Rīga"), which is what the Facts panel shows.
  loc            text        not null default '',
  -- Cover image.
  img            text        not null default '',
  -- Card image for the Home "See the Spaces" grid; the design uses a different crop
  -- there than on the Projects page. Falls back to `img` when null.
  space_img      text,
  images         text[]      not null default '{}',
  short_desc     text        not null default '',
  full_desc      text        not null default '',
  service        text        not null default '',
  country        text        not null default '',
  -- Shown in the public Facts panel ("Rīga (Milgrāvis)").
  city           text        not null default '',
  client         text        not null default '',
  -- ISO 'YYYY-MM-DD' (the admin uses <input type="date">). The public site shows only
  -- the year, matching the design's `yr()` helper. Empty string = ongoing / unknown.
  start_date     text        not null default '',
  end_date       text        not null default '',
  status         text        not null default 'Completed'
                   check (status in ('In Progress', 'Completed', 'Paused')),
  official_label text,
  official_url   text,
  sort_order     integer     not null default 0,
  published      boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists projects_sort_order_idx on public.projects (sort_order);
create index if not exists projects_published_idx  on public.projects (published);

-- Keep updated_at honest.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: the world may read published rows; only signed-in users write.
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

drop policy if exists "public read published projects" on public.projects;
create policy "public read published projects"
  on public.projects
  for select
  to anon, authenticated
  using (published = true);

-- Authenticated users (the admin) can see everything, including unpublished drafts.
drop policy if exists "authenticated read all projects" on public.projects;
create policy "authenticated read all projects"
  on public.projects
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated insert projects" on public.projects;
create policy "authenticated insert projects"
  on public.projects
  for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update projects" on public.projects;
create policy "authenticated update projects"
  on public.projects
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated delete projects" on public.projects;
create policy "authenticated delete projects"
  on public.projects
  for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Seed: the six projects from the design. Re-runnable.
-- ---------------------------------------------------------------------------
insert into public.projects
  (slug, title, loc, img, space_img, images, short_desc, service, country, city, client,
   start_date, end_date, status, official_label, official_url, sort_order, published)
values
  ('rimi', 'Rimi Latvia', 'RIMI Milgrāvis',
   'images/proj-rimi.png', 'images/rimi.png',
   array['images/proj-rimi.png','images/rimi.png','images/svc-1.png','images/img-9c88.png','images/img-be98.png','images/img-97b7.png','images/img-193d.png','images/home-interior.png'],
   'Retail hypermarket fit-out.',
   'Drywall partition installation, interior finishing', 'Latvia', 'Rīga (Milgrāvis)', 'RIMI Latvia',
   '2021-04-01', '2022-08-01', 'Completed', 'Rimi Latvia', 'https://www.rimi.lv', 1, true),

  ('kuldiga', 'Kuldīga Park Development', 'Kuldīgas parks',
   'images/proj-kuldiga.png', 'images/img-771e.png',
   array['images/proj-kuldiga.png','images/img-771e.png','images/pv-hero.jpg','images/svc-1.png','images/img-9c88.png','images/img-be98.png','images/home-interior.png','images/img-97b7.png'],
   'Multi-apartment complex finishing.',
   'Gypsum partition wall installation, tiling, plastering', 'Latvia', 'Rīga (Āgenskalns)', 'Kuldīga Park Development',
   '2022-02-01', '2023-06-01', 'Completed', 'Hipekon: Kuldīgas Parks', 'https://www.hipekon.lv', 2, true),

  ('kepler', 'Kepler Club', 'Kepler Club: Hotel & Lounge at RIX Airport',
   'images/proj-kepler.png', 'images/img-aa46.png',
   array['images/proj-kepler.png','images/img-aa46.png','images/img-9c88.png','images/home-interior.png','images/svc-1.png','images/img-be98.png','images/img-193d.png','images/img-97b7.png'],
   'Airport lounge custom fit-out.',
   'Interior finishing, custom fit-out', 'Latvia', 'Rīga (RIX Airport)', 'Kepler',
   '2023-01-01', '2023-05-01', 'Completed', 'Kepler Club', 'https://kepler.club', 3, true),

  ('moho', 'MOHO Park Development', 'MOHO PARK',
   'images/proj-moho.png', 'images/img-39bf.png',
   array['images/proj-moho.png','images/img-39bf.png','images/home-hero.jpg','images/svc-1.png','images/img-9c88.png','images/img-be98.png','images/img-193d.png','images/home-interior.png'],
   'Residential towers.',
   'Drywall, finishing, plastering', 'Latvia', 'Rīga', 'MOHO Park',
   '2023-01-01', '2024-01-01', 'Completed', 'MOHO Park', 'https://mohopark.lv', 4, true),

  ('daugavas', 'Daugava Athletics Hall', 'Daugavas Vieglatlētikas Manēža',
   'images/img-553f.png', 'images/img-553f.png',
   array['images/img-553f.png','images/svc-1.png','images/img-97b7.png','images/img-9c88.png','images/img-be98.png','images/img-193d.png','images/home-interior.png','images/proj-moho.png'],
   'Sports hall structural works.',
   'Structural finishing, drywall systems', 'Latvia', 'Rīga', 'Daugava Stadium',
   '2020-05-01', '2021-02-01', 'Completed', 'Daugava Stadium', 'https://www.daugavasstadions.lv', 5, true),

  ('sweden', 'Private Object in Sweden', 'Private Object, Sweden',
   'images/img-575d.png', 'images/img-575d.png',
   array['images/img-575d.png','images/img-5279.png','images/img-97b7.png','images/svc-1.png','images/img-9c88.png','images/img-be98.png','images/home-interior.png','images/img-193d.png'],
   'Private timber residence.',
   'Wood construction, exterior & interior finishing', 'Sweden', '—', 'Private',
   '2022-06-01', '2023-03-01', 'Completed', null, null, 6, true)
on conflict (slug) do nothing;

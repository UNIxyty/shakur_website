-- SHAKUR — v2 → v3 in-place migration for an EXISTING deployed database.
-- Re-runnable: every step is guarded (IF EXISTS / IF NOT EXISTS / ON CONFLICT).
-- Fresh installs should use supabase/schema.sql instead (it already contains
-- everything below). Run AFTER supabase/migrate-v2.sql on a v1 database.
--
-- What it adds:
--   1. home_sections (Home-page CMS) + the postgres-owned home_public view
--      (anon reads published content ONLY — never drafts), seeded published
--      with the design's homeCms defaults.
--   2. consultation_requests (hero "Request a Consultation" leads; PII —
--      no anon policies, server-side inserts via the service key).
--   3. media_assets (Home-CMS image uploads via POST /api/media).
--
-- Storage: also run supabase/storage.sql to (re)create the `media` bucket.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- 1. home_sections — Home-page CMS (the admin "Home page" view). One row per
-- section ('hero' | 'partner' | 'cta' | 'text'); `draft` is what the admin
-- edits, `published` is what the public site renders (null = never published).
-- ===========================================================================
create table if not exists public.home_sections (
  section    text primary key check (section in ('hero', 'partner', 'cta', 'text')),
  draft      jsonb       not null,
  published  jsonb,
  status     text        not null default 'draft' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now()
);

drop trigger if exists home_sections_set_updated_at on public.home_sections;
create trigger home_sections_set_updated_at
  before update on public.home_sections
  for each row execute function public.set_updated_at();

alter table public.home_sections enable row level security;

-- authenticated full CRUD; NO anon policies — drafts stay private. The public
-- site reads through the home_public view below instead.
drop policy if exists "authenticated read home sections" on public.home_sections;
create policy "authenticated read home sections"
  on public.home_sections for select
  to authenticated
  using (true);

drop policy if exists "authenticated insert home sections" on public.home_sections;
create policy "authenticated insert home sections"
  on public.home_sections for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update home sections" on public.home_sections;
create policy "authenticated update home sections"
  on public.home_sections for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated delete home sections" on public.home_sections;
create policy "authenticated delete home sections"
  on public.home_sections for delete
  to authenticated
  using (true);

-- Public read of PUBLISHED content only. The view is owned by postgres (the
-- role running this script) and is not security_invoker, so selecting from it
-- runs with the owner's privileges and bypasses home_sections RLS — which is
-- the point: anon gets exactly the published column, never drafts.
create or replace view public.home_public as
  select section, published
  from public.home_sections
  where published is not null;

grant select on public.home_public to anon, authenticated;

-- ===========================================================================
-- 2. consultation_requests — hero "Request a Consultation" leads. Written
-- ONLY by the server API (service role); requester PII is never reachable
-- with the anon key (same stance as meetings).
-- ===========================================================================
create table if not exists public.consultation_requests (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  phone      text not null,
  email      text not null,
  message    text not null default '',
  locale     text not null default 'en' check (locale in ('en', 'lv', 'ru')),
  status     text not null default 'new' check (status in ('new', 'contacted', 'closed'))
);

create index if not exists consultation_requests_created_idx
  on public.consultation_requests (created_at desc);

alter table public.consultation_requests enable row level security;

-- PII: NO anon policies at all, and no INSERT policy — inserts happen
-- server-side via the service-role key. authenticated may read/update
-- (future admin view).
drop policy if exists "authenticated read consultation requests" on public.consultation_requests;
create policy "authenticated read consultation requests"
  on public.consultation_requests for select
  to authenticated
  using (true);

drop policy if exists "authenticated update consultation requests" on public.consultation_requests;
create policy "authenticated update consultation requests"
  on public.consultation_requests for update
  to authenticated
  using (true)
  with check (true);

-- ===========================================================================
-- 3. media_assets — Home-CMS image uploads (POST /api/media). Files land in
-- the api container's MEDIA_DIR first (served by nginx at /media/), then
-- replicate to the public `media` storage bucket in the background.
-- ===========================================================================
create table if not exists public.media_assets (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  filename           text   not null,          -- stored name (uuid.ext)
  original_name      text   not null,
  mime               text   not null,
  size               bigint not null,
  public_path        text   not null,          -- '/media/<filename>' (nginx, local-first)
  supabase_url       text,                     -- deterministic public URL in bucket `media`
  replication_status text   not null default 'pending'
                     check (replication_status in ('pending', 'done', 'failed'))
);

create index if not exists media_assets_created_idx
  on public.media_assets (created_at desc);

alter table public.media_assets enable row level security;

-- Rows are admin metadata (the files themselves are public via nginx and the
-- bucket): authenticated select only; the server writes via the service key.
drop policy if exists "authenticated read media assets" on public.media_assets;
create policy "authenticated read media assets"
  on public.media_assets for select
  to authenticated
  using (true);

-- ===========================================================================
-- Seed: all four home sections published with the design's homeCms defaults
-- (ShakurAdminPanel.dc.html state, copied verbatim incl. LV/RU). Images are
-- the repo's public/images/* presets. Re-runnable.
-- ===========================================================================
insert into public.home_sections (section, draft, published, status)
select s.section, s.content, s.content, 'published'
from (values
  ('hero',    $j${"image":"images/home-hero.jpg"}$j$::jsonb),
  ('partner', $j${"image":"images/home-interior.png"}$j$::jsonb),
  ('cta',     $j${"image":"images/cta-meeting.jpg"}$j$::jsonb),
  ('text',    $j${
    "heroTitle": {"en":"Interior Finish Experts","lv":"Iekšdarbu apdares eksperti","ru":"Эксперты по внутренней отделке"},
    "heroSub": {"en":"From drywall installation to tiling and painting — we deliver high-quality interior finishing with clear pricing, on-time completion, and a 5-year warranty.","lv":"No ģipškartona montāžas līdz flīzēšanai un krāsošanai — augstas kvalitātes apdare ar skaidrām cenām un 5 gadu garantiju.","ru":"От монтажа гипсокартона до плитки и покраски — качественная отделка с прозрачными ценами и 5-летней гарантией."},
    "partnerTitle": {"en":"Your Partner in Quality Interior Finishing","lv":"Jūsu partneris kvalitatīvā apdarē","ru":"Ваш партнёр в качественной отделке"},
    "partnerItems": [
      {"a":{"en":"Premium Interior Installation","lv":"Augstākā līmeņa montāža","ru":"Премиальная отделка"},
       "b":{"en":"Our skilled team delivers flawless drywall, tiling, and finishing work with lasting quality.","lv":"Mūsu komanda veic nevainojamu ģipškartona un apdares darbu ar noturīgu kvalitāti.","ru":"Наша команда выполняет безупречную отделку с долговечным качеством."}},
      {"a":{"en":"98% Journal Completion","lv":"98% žurnāla aizpildīšana","ru":"98% заполнение журнала"},
       "b":{"en":"We maintain a 98% project-journal completion rate — full documentation, permits, and compliance records.","lv":"Uzturam 98% projektu žurnāla aizpildīšanu — pilna dokumentācija un atbilstība.","ru":"Поддерживаем 98% заполнение журнала — полная документация и соответствие."}},
      {"a":{"en":"Fast and Reliable Repairs","lv":"Ātri un uzticami remonti","ru":"Быстрый и надёжный ремонт"},
       "b":{"en":"From minor fixes to major work — we restore interiors quickly, cleanly, and precisely.","lv":"No maziem labojumiem līdz lieliem darbiem — ātri, tīri un precīzi.","ru":"От мелкого ремонта до крупных работ — быстро, чисто и точно."}},
      {"a":{"en":"Stress-Free Interior Construction","lv":"Bezrūpīga būvniecība","ru":"Отделка без забот"},
       "b":{"en":"From concept to delivery, we manage the whole process with precision and care.","lv":"No idejas līdz nodošanai vadām visu procesu ar rūpību.","ru":"От идеи до сдачи ведём весь процесс с вниманием."}}
    ],
    "ctaTitle": {"en":"Are you ready to discuss your renovation?","lv":"Vai esat gatavs pārrunāt savu renovāciju?","ru":"Готовы обсудить ваш ремонт?"},
    "ctaSub": {"en":"Protect and transform your home with high-quality finishing and drywall services. From small repairs to complete renovations — we handle it all professionally. Get your free consultation today!","lv":"Aizsargājiet un pārveidojiet savu māju ar augstas kvalitātes apdari. No maziem remontiem līdz pilnīgām renovācijām — darām visu profesionāli. Saņemiet bezmaksas konsultāciju!","ru":"Защитите и преобразите свой дом с помощью качественной отделки. От мелкого ремонта до полной реновации — делаем всё профессионально. Получите бесплатную консультацию!"},
    "ctaBtn": {"en":"Request a Consultation","lv":"Pieteikt konsultāciju","ru":"Заказать консультацию"}
  }$j$::jsonb)
) as s(section, content)
on conflict (section) do nothing;

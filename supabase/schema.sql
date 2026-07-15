-- SHAKUR — v4 schema: projects (i18n/media JSON), services, meetings,
-- availability, site_settings (+ v4 status/marquee_speed_s), home_sections
-- (+ home_public view), consultation_requests, media_assets, site_logos.
-- FULL fresh-install script. Idempotent — safe to re-run.
-- Run in the Supabase SQL editor, or: psql "$DATABASE_URL" -f supabase/schema.sql
--
-- Localized TEXT fields are JSON per field: {"en":"…","lv":"…","ru":"…"} (L10n).
-- Shared fields (media, slug, category, dates, client, location, url, cta) are
-- single-value. TS mirror of every shape lives in src/lib/db.ts.
--
-- Upgrading a deployed database? v1 -> v2: supabase/migrate-v2.sql, then
-- v2 -> v3: supabase/migrate-v3.sql, then v3 -> v4: supabase/migrate-v4.sql
-- (+ migrate-v4-media.sql). This file assumes a fresh install.

create extension if not exists "pgcrypto";

-- Keep updated_at honest (shared by every table below).
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
-- projects
-- ===========================================================================
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  -- Route key for /projects/:slug. Derived from the EN title on create, then
  -- held stable so that editing a title never breaks an existing public URL.
  slug       text        not null unique,
  service    text        not null default '',
  -- Project phase pill (public detail page) — distinct from `published`,
  -- which is the admin publish/draft toggle.
  status     text        not null default 'Completed'
               check (status in ('In Progress', 'Completed', 'Paused')),
  published  boolean     not null default true,
  sort_order integer     not null default 0,
  client     text        not null default '',
  country    text        not null default '',
  city       text        not null default '',
  -- Location chip on the public cards ("RIMI Milgrāvis") — deliberately
  -- distinct from `city` ("Rīga"), which is what the Facts panel shows.
  loc        text        not null default '',
  url        text        not null default '',
  -- ISO 'YYYY-MM-DD'; '' = ongoing / unknown. Public site shows only the year.
  start_date text        not null default '',
  end_date   text        not null default '',
  -- Cover is a media item id ('' = first item). media[].src is an absolute
  -- Storage URL for uploads or an images/... design-relative path for seeds.
  cover      text        not null default '',
  media      jsonb       not null default '[]',
  -- Legacy home-grid crop (kept: the Home "See the Spaces" grid uses a
  -- different crop than the project cards).
  space_img  text        not null default '',
  i18n       jsonb       not null default '{"title":{"en":"","lv":"","ru":""},"summary":{"en":"","lv":"","ru":""},"description":{"en":"","lv":"","ru":""}}',
  -- "Scope of work" capability cards 01–04 on the public detail page.
  scope      jsonb       not null default '{"title":{"en":"","lv":"","ru":""},"intro":{"en":"","lv":"","ru":""},"items":[]}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_sort_order_idx on public.projects (sort_order);
create index if not exists projects_published_idx  on public.projects (published);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- services
-- ===========================================================================
create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  slug         text        not null unique,
  category     text        not null default 'Construction'
                 check (category in ('Construction', 'Finishing', 'Support')),
  published    boolean     not null default true,
  sort_order   integer     not null default 0,
  cta_label    jsonb       not null default '{"en":"","lv":"","ru":""}',
  cta_link     text        not null default '/contact',
  cover        text        not null default '',
  media        jsonb       not null default '[]',
  i18n         jsonb       not null default '{"title":{"en":"","lv":"","ru":""},"summary":{"en":"","lv":"","ru":""},"description":{"en":"","lv":"","ru":""}}',
  -- "What we can do" cards 01–04 on the public detail page.
  capabilities jsonb       not null default '{"title":{"en":"","lv":"","ru":""},"intro":{"en":"","lv":"","ru":""},"items":[]}',
  -- Sticky-aside content: highlights ({title, desc}) and fact rows ({label, value}).
  extras       jsonb       not null default '{"highlights":[],"facts":[]}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists services_sort_order_idx on public.services (sort_order);
create index if not exists services_published_idx  on public.services (published);

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- meetings — written ONLY by the server API (service role). Attendee PII is
-- never readable with the anon key.
-- ===========================================================================
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  -- Capability token for the email manage-booking links (/booking/:token).
  token        text        not null unique default encode(gen_random_bytes(16), 'hex'),
  name         text        not null,
  email        text        not null,
  phone        text        not null default '',
  notes        text        not null default '',
  meeting_date text        not null,  -- 'YYYY-MM-DD'
  meeting_time text        not null,  -- 'HH:MM'
  duration_min integer     not null default 30,
  status       text        not null default 'scheduled'
                 check (status in ('scheduled', 'completed', 'canceled')),
  locale       text        not null default 'en'
                 check (locale in ('en', 'lv', 'ru')),
  -- Set once the 24h reminder email has gone out (server reminder loop).
  reminder_sent_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.meetings add column if not exists reminder_sent_at timestamptz;

create index if not exists meetings_date_idx   on public.meetings (meeting_date);
create index if not exists meetings_status_idx on public.meetings (status);

drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- availability — single row (id = 1). Slots are computed server-side, so the
-- schedule shape is not exposed to anon.
-- ===========================================================================
create table if not exists public.availability (
  id             integer primary key check (id = 1),
  week           jsonb       not null,
  slot_minutes   integer     not null default 30,
  buffer_minutes integer     not null default 10,
  timezone       text        not null default 'Europe/Riga',
  blockouts      jsonb       not null default '[]',
  updated_at     timestamptz not null default now()
);

drop trigger if exists availability_set_updated_at on public.availability;
create trigger availability_set_updated_at
  before update on public.availability
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- site_settings — single row (id = 1). Anon-readable (announcement bar text).
-- ===========================================================================
create table if not exists public.site_settings (
  id                   integer primary key check (id = 1),
  title                text        not null default 'SIA SHAKUR',
  tagline              text        not null default '',
  email                text        not null default '',
  phone                text        not null default '',
  lang                 text        not null default 'English',
  announcement_enabled boolean     not null default true,
  announcement_text    text        not null default '',
  -- v4: runtime site mode (replaces the build-time-only VITE_SITE_MODE flag)
  status               text        not null default 'live'
                       check (status in ('live', 'coming_soon')),
  -- v4: logo-carousel speed — seconds per loop for row 1 (row 2 keeps the
  -- designed 25/30 ratio client-side)
  marquee_speed_s      integer     not null default 30
                       check (marquee_speed_s between 5 and 120),
  updated_at           timestamptz not null default now()
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Row Level Security
--   projects/services: anon SELECT where published; authenticated ALL.
--   meetings: authenticated SELECT/UPDATE/DELETE only — NO anon policies, and
--     no INSERT policy (public booking goes through the server API with the
--     service-role key, which bypasses RLS).
--   availability: authenticated only (slots are computed server-side).
--   site_settings: anon SELECT; authenticated ALL.
-- ===========================================================================
alter table public.projects      enable row level security;
alter table public.services      enable row level security;
alter table public.meetings      enable row level security;
alter table public.availability  enable row level security;
alter table public.site_settings enable row level security;

-- projects ------------------------------------------------------------------
drop policy if exists "public read published projects" on public.projects;
create policy "public read published projects"
  on public.projects for select
  to anon, authenticated
  using (published = true);

drop policy if exists "authenticated read all projects" on public.projects;
create policy "authenticated read all projects"
  on public.projects for select
  to authenticated
  using (true);

drop policy if exists "authenticated insert projects" on public.projects;
create policy "authenticated insert projects"
  on public.projects for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update projects" on public.projects;
create policy "authenticated update projects"
  on public.projects for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated delete projects" on public.projects;
create policy "authenticated delete projects"
  on public.projects for delete
  to authenticated
  using (true);

-- services ------------------------------------------------------------------
drop policy if exists "public read published services" on public.services;
create policy "public read published services"
  on public.services for select
  to anon, authenticated
  using (published = true);

drop policy if exists "authenticated read all services" on public.services;
create policy "authenticated read all services"
  on public.services for select
  to authenticated
  using (true);

drop policy if exists "authenticated insert services" on public.services;
create policy "authenticated insert services"
  on public.services for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update services" on public.services;
create policy "authenticated update services"
  on public.services for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated delete services" on public.services;
create policy "authenticated delete services"
  on public.services for delete
  to authenticated
  using (true);

-- meetings ------------------------------------------------------------------
drop policy if exists "authenticated read meetings" on public.meetings;
create policy "authenticated read meetings"
  on public.meetings for select
  to authenticated
  using (true);

drop policy if exists "authenticated update meetings" on public.meetings;
create policy "authenticated update meetings"
  on public.meetings for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated delete meetings" on public.meetings;
create policy "authenticated delete meetings"
  on public.meetings for delete
  to authenticated
  using (true);

-- availability ----------------------------------------------------------------
drop policy if exists "authenticated read availability" on public.availability;
create policy "authenticated read availability"
  on public.availability for select
  to authenticated
  using (true);

drop policy if exists "authenticated insert availability" on public.availability;
create policy "authenticated insert availability"
  on public.availability for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update availability" on public.availability;
create policy "authenticated update availability"
  on public.availability for update
  to authenticated
  using (true)
  with check (true);

-- site_settings ----------------------------------------------------------------
drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "authenticated insert site settings" on public.site_settings;
create policy "authenticated insert site settings"
  on public.site_settings for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update site settings" on public.site_settings;
create policy "authenticated update site settings"
  on public.site_settings for update
  to authenticated
  using (true)
  with check (true);

-- ===========================================================================
-- Seed: the six projects from the design, trilingual. Re-runnable.
-- EN copy is taken verbatim from the design DCLogic states
-- (ShakurProjectDetail.dc.html, ShakurAdminPanel.dc.html); LV/RU translated
-- in the style of src/i18n.ts.
-- ===========================================================================
insert into public.projects
  (slug, service, status, published, sort_order, client, country, city, loc, url,
   start_date, end_date, cover, media, space_img, i18n, scope)
values
('rimi', 'Drywall partition installation, interior finishing', 'Completed', true, 1,
 'RIMI Latvia', 'Latvia', 'Rīga (Milgrāvis)', 'RIMI Milgrāvis', 'https://www.rimi.lv',
 '2021-04-01', '2022-08-01', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/proj-rimi.png"},
   {"id":"m2","type":"image","src":"images/rimi.png"},
   {"id":"m3","type":"image","src":"images/svc-1.png"},
   {"id":"m4","type":"image","src":"images/img-9c88.png"},
   {"id":"m5","type":"image","src":"images/img-be98.png"},
   {"id":"m6","type":"image","src":"images/img-97b7.png"},
   {"id":"m7","type":"image","src":"images/img-193d.png"},
   {"id":"m8","type":"image","src":"images/home-interior.png"}
 ]$j$::jsonb,
 'images/rimi.png',
 $j${
   "title":{"en":"Rimi Latvia","lv":"Rimi Latvia","ru":"Rimi Latvia"},
   "summary":{
     "en":"Retail hypermarket fit-out across 8,400 m², delivered on a live-site schedule.",
     "lv":"Mazumtirdzniecības hipermārketa izbūve 8 400 m² platībā, veikta pēc strādājoša objekta grafika.",
     "ru":"Отделка гипермаркета площадью 8 400 м², выполненная по графику действующего объекта."},
   "description":{
     "en":"Shakur delivered the complete interior build for Rimi's Milgrāvis hypermarket, working to a fixed opening date on a phased, live-site programme. Our crews handled partitions, suspended ceilings, and the full finishing package while coordinating around mechanical, electrical, and refrigeration trades.\n\nThe scope covered back-of-house offices, cold-store surrounds, customer washrooms, and the main sales floor. Every phase was sequenced to keep adjacent areas operational, with nightly cleans and strict dust control so handover areas stayed retail-ready.",
     "lv":"Shakur veica pilnu iekšdarbu izbūvi Rimi Milgrāvja hipermārketā, strādājot pēc fiksēta atvēršanas datuma pakāpeniskā, strādājoša objekta programmā. Mūsu komandas veica starpsienas, piekaramos griestus un pilnu apdares paketi, koordinējoties ar mehānikas, elektrības un saldēšanas iekārtu darbiem.\n\nApjoms ietvēra saimniecības birojus, aukstuma kameru apdares, klientu tualetes un galveno tirdzniecības zāli. Katrs posms tika plānots tā, lai blakus zonas paliktu darbojošās — ar nakts uzkopšanu un stingru putekļu kontroli, lai nododamās platības būtu gatavas tirdzniecībai.",
     "ru":"Shakur выполнил полный комплекс внутренних работ в гипермаркете Rimi в Милгрависе, работая к фиксированной дате открытия по поэтапной программе на действующем объекте. Наши бригады выполнили перегородки, подвесные потолки и полный пакет отделки, координируясь с механическими, электрическими и холодильными подрядчиками.\n\nОбъём включал служебные офисы, обрамление холодильных камер, санузлы для покупателей и основной торговый зал. Каждый этап был выстроен так, чтобы соседние зоны продолжали работать, — с ночной уборкой и строгим контролем пыли, чтобы сдаваемые площади оставались готовыми к торговле."}
 }$j$::jsonb,
 $j${
   "title":{"en":"What we delivered on this build.","lv":"Ko mēs paveicām šajā projektā.","ru":"Что мы выполнили на этом объекте."},
   "intro":{
     "en":"A single accountable team across every interior trade, sequenced around a live retail environment and a fixed opening date.",
     "lv":"Viena atbildīga komanda visos iekšdarbu veidos, plānota ap strādājošu tirdzniecības vidi un fiksētu atvēršanas datumu.",
     "ru":"Одна ответственная команда по всем внутренним работам, выстроенная вокруг работающего магазина и фиксированной даты открытия."},
   "items":[
     {"number":"01",
      "title":{"en":"Partitions & structure","lv":"Starpsienas un konstrukcija","ru":"Перегородки и конструкция"},
      "description":{"en":"Full metal-stud partition system to the retail layout.","lv":"Pilna metāla karkasa starpsienu sistēma pēc tirdzniecības plānojuma.","ru":"Полная система перегородок на металлическом каркасе по торговой планировке."},
      "bullets":[
        {"en":"Back-of-house offices","lv":"Saimniecības biroji","ru":"Служебные офисы"},
        {"en":"Cold-store surrounds","lv":"Aukstuma kameru apdares","ru":"Обрамление холодильных камер"},
        {"en":"Fire-rated separations","lv":"Ugunsdrošās atdalošās sienas","ru":"Противопожарные разделения"}]},
     {"number":"02",
      "title":{"en":"Suspended ceilings","lv":"Piekaramie griesti","ru":"Подвесные потолки"},
      "description":{"en":"Grid and MF ceilings with integrated services.","lv":"Režģu un MF griesti ar integrētām komunikācijām.","ru":"Кассетные и MF-потолки с интегрированными коммуникациями."},
      "bullets":[
        {"en":"Lighting cut-outs","lv":"Izgriezumi apgaismojumam","ru":"Вырезы под освещение"},
        {"en":"HVAC & sprinkler coordination","lv":"Ventilācijas un sprinkleru koordinācija","ru":"Координация вентиляции и спринклеров"},
        {"en":"Access panels","lv":"Revīzijas lūkas","ru":"Ревизионные люки"}]},
     {"number":"03",
      "title":{"en":"Finishing","lv":"Apdare","ru":"Отделка"},
      "description":{"en":"Plaster, tiling, and decoration to a retail standard.","lv":"Apmetums, flīzēšana un dekorēšana tirdzniecības standartā.","ru":"Штукатурка, плитка и отделка по торговому стандарту."},
      "bullets":[
        {"en":"Washroom tiling","lv":"Tualešu flīzēšana","ru":"Плитка в санузлах"},
        {"en":"Level-5 feature walls","lv":"Level-5 akcentu sienas","ru":"Акцентные стены Level-5"},
        {"en":"Snag-free handover","lv":"Nodošana bez defektiem","ru":"Сдача без недоделок"}]},
     {"number":"04",
      "title":{"en":"Programme & logistics","lv":"Grafiks un loģistika","ru":"График и логистика"},
      "description":{"en":"Phased delivery on a live, operational site.","lv":"Pakāpeniska izpilde strādājošā objektā.","ru":"Поэтапная сдача на действующем объекте."},
      "bullets":[
        {"en":"Night works","lv":"Nakts darbi","ru":"Ночные работы"},
        {"en":"Dust control","lv":"Putekļu kontrole","ru":"Контроль пыли"},
        {"en":"Fixed opening date met","lv":"Fiksētais atvēršanas datums ievērots","ru":"Фиксированная дата открытия соблюдена"}]}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

insert into public.projects
  (slug, service, status, published, sort_order, client, country, city, loc, url,
   start_date, end_date, cover, media, space_img, i18n, scope)
values
('kuldiga', 'Gypsum partition wall installation, tiling, plastering', 'Completed', true, 2,
 'Kuldīga Park Development', 'Latvia', 'Rīga (Āgenskalns)', 'Kuldīgas parks', 'https://www.hipekon.lv',
 '2022-02-01', '2023-06-01', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/proj-kuldiga.png"},
   {"id":"m2","type":"image","src":"images/img-771e.png"},
   {"id":"m3","type":"image","src":"images/pv-hero.jpg"},
   {"id":"m4","type":"image","src":"images/svc-1.png"},
   {"id":"m5","type":"image","src":"images/img-9c88.png"},
   {"id":"m6","type":"image","src":"images/img-be98.png"},
   {"id":"m7","type":"image","src":"images/home-interior.png"},
   {"id":"m8","type":"image","src":"images/img-97b7.png"}
 ]$j$::jsonb,
 'images/img-771e.png',
 $j${
   "title":{"en":"Kuldīga Park Development","lv":"Kuldīgas parka projekts","ru":"Проект Kuldīgas Parks"},
   "summary":{
     "en":"Multi-apartment complex finishing — plaster, paint, and detailing throughout.",
     "lv":"Daudzdzīvokļu kompleksa apdare — apmetums, krāsojums un detaļas visā projektā.",
     "ru":"Отделка многоквартирного комплекса — штукатурка, покраска и детали по всему проекту."},
   "description":{
     "en":"Complete finishing package across a multi-block residential development.",
     "lv":"Pilna apdares pakete daudzkorpusu dzīvojamā kompleksā.",
     "ru":"Полный пакет отделочных работ в многокорпусном жилом комплексе."}
 }$j$::jsonb,
 $j${
   "title":{"en":"The full finishing package, block by block.","lv":"Pilna apdares pakete, korpusu pa korpusam.","ru":"Полный пакет отделки, корпус за корпусом."},
   "intro":{
     "en":"A single finishing team across a multi-block residential development — consistent quality from the first apartment to the last.",
     "lv":"Viena apdares komanda visā daudzkorpusu dzīvojamā kompleksā — nemainīga kvalitāte no pirmā dzīvokļa līdz pēdējam.",
     "ru":"Одна отделочная команда на весь многокорпусный жилой комплекс — стабильное качество от первой квартиры до последней."},
   "items":[
     {"number":"01",
      "title":{"en":"Plastering","lv":"Apmešana","ru":"Штукатурка"},
      "description":{"en":"Machine and hand plastering across every unit.","lv":"Mašīnapmetums un rokas apmetums katrā dzīvoklī.","ru":"Машинная и ручная штукатурка в каждой квартире."},
      "bullets":[
        {"en":"Walls & ceilings","lv":"Sienas un griesti","ru":"Стены и потолки"},
        {"en":"Skim-coat finishing","lv":"Nogludinošā apdare","ru":"Финишная шпаклёвка"},
        {"en":"Crack-free surfaces","lv":"Virsmas bez plaisām","ru":"Поверхности без трещин"}]},
     {"number":"02",
      "title":{"en":"Painting & decoration","lv":"Krāsošana un dekorēšana","ru":"Покраска и декорирование"},
      "description":{"en":"Uniform decoration to the developer's spec.","lv":"Vienota dekorēšana pēc attīstītāja specifikācijas.","ru":"Единая отделка по спецификации застройщика."},
      "bullets":[
        {"en":"Colour-matched systems","lv":"Saskaņoti krāsu toņi","ru":"Согласованные цвета"},
        {"en":"Common areas & stairwells","lv":"Koplietošanas telpas un kāpņutelpas","ru":"Общие зоны и лестничные клетки"},
        {"en":"Protective coats","lv":"Aizsargpārklājumi","ru":"Защитные слои"}]},
     {"number":"03",
      "title":{"en":"Tiling","lv":"Flīzēšana","ru":"Плиточные работы"},
      "description":{"en":"Bathrooms and kitchens tiled to the show-home standard.","lv":"Vannas istabas un virtuves, izflīzētas parauga dzīvokļa standartā.","ru":"Ванные и кухни, облицованные по стандарту шоу-рума."},
      "bullets":[
        {"en":"Waterproofed wet rooms","lv":"Hidroizolētas mitrās telpas","ru":"Гидроизолированные влажные зоны"},
        {"en":"Wall & floor tiling","lv":"Sienu un grīdu flīzēšana","ru":"Плитка на стены и пол"},
        {"en":"Silicone detailing","lv":"Silikona šuvju apstrāde","ru":"Силиконовые швы"}]},
     {"number":"04",
      "title":{"en":"Handover","lv":"Nodošana","ru":"Сдача"},
      "description":{"en":"Apartment-by-apartment quality control.","lv":"Kvalitātes kontrole dzīvokli pa dzīvoklim.","ru":"Контроль качества квартира за квартирой."},
      "bullets":[
        {"en":"Snag lists closed","lv":"Defektu saraksti slēgti","ru":"Списки недоделок закрыты"},
        {"en":"Developer walkthroughs","lv":"Apskates ar attīstītāju","ru":"Обходы с застройщиком"},
        {"en":"Phased handover met","lv":"Pakāpeniskā nodošana ievērota","ru":"Поэтапная сдача соблюдена"}]}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

insert into public.projects
  (slug, service, status, published, sort_order, client, country, city, loc, url,
   start_date, end_date, cover, media, space_img, i18n, scope)
values
('kepler', 'Interior finishing, custom fit-out', 'Completed', true, 3,
 'Kepler', 'Latvia', 'Rīga (RIX Airport)', 'Kepler Club: Hotel & Lounge at RIX Airport', 'https://kepler.club',
 '2023-01-01', '2023-05-01', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/proj-kepler.png"},
   {"id":"m2","type":"image","src":"images/img-aa46.png"},
   {"id":"m3","type":"image","src":"images/img-9c88.png"},
   {"id":"m4","type":"image","src":"images/home-interior.png"},
   {"id":"m5","type":"image","src":"images/svc-1.png"},
   {"id":"m6","type":"image","src":"images/img-be98.png"},
   {"id":"m7","type":"image","src":"images/img-193d.png"},
   {"id":"m8","type":"image","src":"images/img-97b7.png"}
 ]$j$::jsonb,
 'images/img-aa46.png',
 $j${
   "title":{"en":"Kepler Club","lv":"Kepler Club","ru":"Kepler Club"},
   "summary":{
     "en":"Airport lounge custom fit-out with feature walls and bespoke joinery.",
     "lv":"Lidostas atpūtas zonas individuāla izbūve ar akcentu sienām un galdniecību pēc pasūtījuma.",
     "ru":"Индивидуальная отделка лаунжа аэропорта с акцентными стенами и столяркой на заказ."},
   "description":{
     "en":"A premium lounge fit-out at RIX airport, delivered to a tight aviation programme.",
     "lv":"Premium atpūtas zonas izbūve RIX lidostā, veikta pēc saspringta aviācijas grafika.",
     "ru":"Отделка премиального лаунжа в аэропорту RIX, выполненная по жёсткому авиационному графику."}
 }$j$::jsonb,
 $j${
   "title":{"en":"A premium fit-out, delivered airside.","lv":"Premium izbūve, veikta lidostas drošības zonā.","ru":"Премиальная отделка, выполненная в стерильной зоне аэропорта."},
   "intro":{
     "en":"Feature finishes and bespoke joinery inside a live airport — delivered on a tight aviation programme with strict security logistics.",
     "lv":"Akcentu apdare un individuāla galdniecība strādājošā lidostā — veikta pēc saspringta aviācijas grafika ar stingru drošības loģistiku.",
     "ru":"Акцентная отделка и столярка на заказ внутри действующего аэропорта — по жёсткому авиационному графику со строгой логистикой безопасности."},
   "items":[
     {"number":"01",
      "title":{"en":"Feature walls","lv":"Akcentu sienas","ru":"Акцентные стены"},
      "description":{"en":"Statement surfaces for a premium lounge feel.","lv":"Izteiksmīgas virsmas premium atpūtas zonas sajūtai.","ru":"Выразительные поверхности для атмосферы премиального лаунжа."},
      "bullets":[
        {"en":"Level-5 feature walls","lv":"Level-5 akcentu sienas","ru":"Акцентные стены Level-5"},
        {"en":"Timber slat panelling","lv":"Koka līstu paneļi","ru":"Реечные деревянные панели"},
        {"en":"Integrated lighting details","lv":"Integrēta apgaismojuma detaļas","ru":"Интегрированные детали освещения"}]},
     {"number":"02",
      "title":{"en":"Bespoke joinery","lv":"Individuāla galdniecība","ru":"Столярка на заказ"},
      "description":{"en":"Custom-built bar, counters, and fittings.","lv":"Pēc pasūtījuma būvēts bārs, letes un aprīkojums.","ru":"Барная стойка, прилавки и оснащение, изготовленные на заказ."},
      "bullets":[
        {"en":"Reception & bar joinery","lv":"Reģistratūras un bāra galdniecība","ru":"Столярка ресепшена и бара"},
        {"en":"Built-in seating","lv":"Iebūvētas sēdvietas","ru":"Встроенные сиденья"},
        {"en":"Bespoke storage","lv":"Individuālas glabātuves","ru":"Индивидуальные системы хранения"}]},
     {"number":"03",
      "title":{"en":"Finishing","lv":"Apdare","ru":"Отделка"},
      "description":{"en":"Premium materials, precisely detailed.","lv":"Premium materiāli, precīzi detalizēti.","ru":"Премиальные материалы с точной детализацией."},
      "bullets":[
        {"en":"Premium paint systems","lv":"Premium krāsu sistēmas","ru":"Премиальные системы окраски"},
        {"en":"Stone & tile accents","lv":"Akmens un flīžu akcenti","ru":"Акценты из камня и плитки"},
        {"en":"Acoustic treatments","lv":"Akustiskā apdare","ru":"Акустическая отделка"}]},
     {"number":"04",
      "title":{"en":"Airside logistics","lv":"Drošības zonas loģistika","ru":"Логистика стерильной зоны"},
      "description":{"en":"Working inside airport security.","lv":"Darbs lidostas drošības zonā.","ru":"Работа внутри зоны авиационной безопасности."},
      "bullets":[
        {"en":"Escorted crews & passes","lv":"Pavadītas komandas un caurlaides","ru":"Сопровождение бригад и пропуска"},
        {"en":"Night-shift programme","lv":"Nakts maiņu grafiks","ru":"График ночных смен"},
        {"en":"Fixed opening date met","lv":"Fiksētais atvēršanas datums ievērots","ru":"Фиксированная дата открытия соблюдена"}]}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

insert into public.projects
  (slug, service, status, published, sort_order, client, country, city, loc, url,
   start_date, end_date, cover, media, space_img, i18n, scope)
values
('moho', 'Drywall, finishing, plastering', 'Completed', true, 4,
 'MOHO Park', 'Latvia', 'Rīga', 'MOHO PARK', 'https://mohopark.lv',
 '2023-01-01', '2024-01-01', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/proj-moho.png"},
   {"id":"m2","type":"image","src":"images/img-39bf.png"},
   {"id":"m3","type":"image","src":"images/home-hero.jpg"},
   {"id":"m4","type":"image","src":"images/svc-1.png"},
   {"id":"m5","type":"image","src":"images/img-9c88.png"},
   {"id":"m6","type":"image","src":"images/img-be98.png"},
   {"id":"m7","type":"image","src":"images/img-193d.png"},
   {"id":"m8","type":"image","src":"images/home-interior.png"}
 ]$j$::jsonb,
 'images/img-39bf.png',
 $j${
   "title":{"en":"MOHO Park Development","lv":"MOHO parka projekts","ru":"Проект MOHO Park"},
   "summary":{
     "en":"Residential towers — drywall and partition systems across every floor.",
     "lv":"Dzīvojamie torņi — ģipškartona un starpsienu sistēmas katrā stāvā.",
     "ru":"Жилые башни — системы гипсокартона и перегородок на каждом этаже."},
   "description":{
     "en":"Drywall and partition works across every floor of the MOHO Park residential towers.",
     "lv":"Ģipškartona un starpsienu darbi visos MOHO Park dzīvojamo torņu stāvos.",
     "ru":"Работы по гипсокартону и перегородкам на всех этажах жилых башен MOHO Park."}
 }$j$::jsonb,
 $j${
   "title":{"en":"Drywall at residential-tower scale.","lv":"Ģipškartons dzīvojamo torņu mērogā.","ru":"Гипсокартон в масштабе жилых башен."},
   "intro":{
     "en":"Partition and ceiling systems across every floor of the MOHO Park towers — sequenced with the developer's trades on a rolling programme.",
     "lv":"Starpsienu un griestu sistēmas katrā MOHO Park torņu stāvā — plānotas kopā ar attīstītāja darbiem ritošā grafikā.",
     "ru":"Системы перегородок и потолков на каждом этаже башен MOHO Park — по скользящему графику вместе с подрядчиками застройщика."},
   "items":[
     {"number":"01",
      "title":{"en":"Partition systems","lv":"Starpsienu sistēmas","ru":"Системы перегородок"},
      "description":{"en":"Metal-stud partitions across every apartment.","lv":"Metāla karkasa starpsienas katrā dzīvoklī.","ru":"Перегородки на металлическом каркасе в каждой квартире."},
      "bullets":[
        {"en":"Apartment separating walls","lv":"Dzīvokļu atdalošās sienas","ru":"Межквартирные стены"},
        {"en":"Acoustic build-ups","lv":"Akustiskās konstrukcijas","ru":"Акустические конструкции"},
        {"en":"Fire-rated assemblies","lv":"Ugunsdrošās konstrukcijas","ru":"Огнестойкие сборки"}]},
     {"number":"02",
      "title":{"en":"Ceilings","lv":"Griesti","ru":"Потолки"},
      "description":{"en":"Suspended ceilings with integrated services.","lv":"Piekaramie griesti ar integrētām komunikācijām.","ru":"Подвесные потолки с интегрированными коммуникациями."},
      "bullets":[
        {"en":"MF ceiling systems","lv":"MF griestu sistēmas","ru":"Системы MF-потолков"},
        {"en":"Service voids","lv":"Komunikāciju šahtas","ru":"Ниши для коммуникаций"},
        {"en":"Access panels","lv":"Revīzijas lūkas","ru":"Ревизионные люки"}]},
     {"number":"03",
      "title":{"en":"Boarding & finishing","lv":"Apšuvums un apdare","ru":"Обшивка и отделка"},
      "description":{"en":"Taped, jointed, paint-ready surfaces.","lv":"Špaktelētas, krāsošanai gatavas virsmas.","ru":"Зашпаклёванные поверхности, готовые под покраску."},
      "bullets":[
        {"en":"Moisture board in wet rooms","lv":"Mitrumizturīgās plāksnes mitrajās telpās","ru":"Влагостойкие плиты во влажных зонах"},
        {"en":"Jointing & skimming","lv":"Šuvju aizpildīšana un gludināšana","ru":"Заделка швов и шпаклёвка"},
        {"en":"Decorator-ready handover","lv":"Nodošana gatava krāsotājam","ru":"Сдача под маляра"}]},
     {"number":"04",
      "title":{"en":"Programme","lv":"Grafiks","ru":"График"},
      "description":{"en":"Floor-by-floor delivery to the developer's schedule.","lv":"Izpilde stāvu pa stāvam pēc attīstītāja grafika.","ru":"Сдача этаж за этажом по графику застройщика."},
      "bullets":[
        {"en":"Rolling floor cycles","lv":"Ritoši stāvu cikli","ru":"Скользящие циклы по этажам"},
        {"en":"Trade coordination","lv":"Darbu koordinācija","ru":"Координация подрядчиков"},
        {"en":"Weekly progress reporting","lv":"Iknedēļas progresa atskaites","ru":"Еженедельные отчёты о ходе работ"}]}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

insert into public.projects
  (slug, service, status, published, sort_order, client, country, city, loc, url,
   start_date, end_date, cover, media, space_img, i18n, scope)
values
('daugavas', 'Structural finishing, drywall systems', 'Completed', true, 5,
 'Daugava Stadium', 'Latvia', 'Rīga', 'Daugavas Vieglatlētikas Manēža', 'https://www.daugavasstadions.lv',
 '2020-05-01', '2021-02-01', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/img-553f.png"},
   {"id":"m2","type":"image","src":"images/svc-1.png"},
   {"id":"m3","type":"image","src":"images/img-97b7.png"},
   {"id":"m4","type":"image","src":"images/img-9c88.png"},
   {"id":"m5","type":"image","src":"images/img-be98.png"},
   {"id":"m6","type":"image","src":"images/img-193d.png"},
   {"id":"m7","type":"image","src":"images/home-interior.png"},
   {"id":"m8","type":"image","src":"images/proj-moho.png"}
 ]$j$::jsonb,
 'images/img-553f.png',
 $j${
   "title":{"en":"Daugava Athletics Hall","lv":"Daugavas vieglatlētikas manēža","ru":"Легкоатлетический манеж «Даугава»"},
   "summary":{
     "en":"Sports hall structural works — masonry, blockwork, and concrete.",
     "lv":"Sporta halles konstrukciju darbi — mūrniecība, bloku mūris un betons.",
     "ru":"Конструктивные работы спортивного зала — кладка, блоки и бетон."},
   "description":{
     "en":"Structural masonry and concrete works for a municipal athletics hall.",
     "lv":"Nesošās mūrniecības un betona darbi pašvaldības vieglatlētikas manēžā.",
     "ru":"Несущая кладка и бетонные работы для муниципального легкоатлетического манежа."}
 }$j$::jsonb,
 $j${
   "title":{"en":"Structural works for a municipal sports hall.","lv":"Konstrukciju darbi pašvaldības sporta hallē.","ru":"Конструктивные работы для муниципального спортзала."},
   "intro":{
     "en":"Masonry, blockwork, and concrete for the Daugava athletics hall — heavy structural work delivered to public-sector standards.",
     "lv":"Mūrniecība, bloku mūris un betons Daugavas vieglatlētikas manēžai — smagie konstrukciju darbi atbilstoši publiskā sektora standartiem.",
     "ru":"Кладка, блоки и бетон для легкоатлетического манежа «Даугава» — тяжёлые конструктивные работы по стандартам публичного сектора."},
   "items":[
     {"number":"01",
      "title":{"en":"Blockwork","lv":"Bloku mūris","ru":"Блочная кладка"},
      "description":{"en":"Load-bearing and partition block walls.","lv":"Nesošās un starpsienu bloku sienas.","ru":"Несущие и перегородочные блочные стены."},
      "bullets":[
        {"en":"Structural blockwork","lv":"Nesošais bloku mūris","ru":"Несущая блочная кладка"},
        {"en":"Reinforced courses","lv":"Stiegrotas rindas","ru":"Армированные ряды"},
        {"en":"Movement joints","lv":"Deformācijas šuves","ru":"Деформационные швы"}]},
     {"number":"02",
      "title":{"en":"Concrete works","lv":"Betona darbi","ru":"Бетонные работы"},
      "description":{"en":"Slabs, plinths, and structural concrete.","lv":"Plātnes, pamatnes un konstrukciju betons.","ru":"Плиты, цоколи и конструкционный бетон."},
      "bullets":[
        {"en":"Reinforced slabs","lv":"Stiegrotas plātnes","ru":"Армированные плиты"},
        {"en":"Formwork & pouring","lv":"Veidņi un betonēšana","ru":"Опалубка и заливка"},
        {"en":"Surface finishing","lv":"Virsmas apstrāde","ru":"Отделка поверхности"}]},
     {"number":"03",
      "title":{"en":"Drywall systems","lv":"Ģipškartona sistēmas","ru":"Системы гипсокартона"},
      "description":{"en":"Interior linings over the structural shell.","lv":"Iekšējās apšuves virs nesošās konstrukcijas.","ru":"Внутренние обшивки поверх несущего каркаса."},
      "bullets":[
        {"en":"Wall linings","lv":"Sienu apšuvums","ru":"Обшивка стен"},
        {"en":"Suspended ceilings","lv":"Piekaramie griesti","ru":"Подвесные потолки"},
        {"en":"Acoustic separation","lv":"Akustiskā atdalīšana","ru":"Акустическое разделение"}]},
     {"number":"04",
      "title":{"en":"Compliance","lv":"Atbilstība","ru":"Соответствие нормам"},
      "description":{"en":"Public-project documentation throughout.","lv":"Publiskā projekta dokumentācija visā gaitā.","ru":"Документация публичного проекта на всех этапах."},
      "bullets":[
        {"en":"Building-control records","lv":"Būvuzraudzības dokumentācija","ru":"Записи стройнадзора"},
        {"en":"Material certification","lv":"Materiālu sertifikācija","ru":"Сертификация материалов"},
        {"en":"Stage inspections","lv":"Posmu pārbaudes","ru":"Поэтапные проверки"}]}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

insert into public.projects
  (slug, service, status, published, sort_order, client, country, city, loc, url,
   start_date, end_date, cover, media, space_img, i18n, scope)
values
('sweden', 'Wood construction, exterior & interior finishing', 'Completed', true, 6,
 'Private', 'Sweden', '—', 'Private Object, Sweden', '',
 '2022-06-01', '2023-03-01', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/img-575d.png"},
   {"id":"m2","type":"image","src":"images/img-5279.png"},
   {"id":"m3","type":"image","src":"images/img-97b7.png"},
   {"id":"m4","type":"image","src":"images/svc-1.png"},
   {"id":"m5","type":"image","src":"images/img-9c88.png"},
   {"id":"m6","type":"image","src":"images/img-be98.png"},
   {"id":"m7","type":"image","src":"images/home-interior.png"},
   {"id":"m8","type":"image","src":"images/img-193d.png"}
 ]$j$::jsonb,
 'images/img-575d.png',
 $j${
   "title":{"en":"Private Object in Sweden","lv":"Privāts objekts Zviedrijā","ru":"Частный объект в Швеции"},
   "summary":{
     "en":"Private timber residence — framing, cladding, and bespoke joinery.",
     "lv":"Privāta koka dzīvojamā māja — karkass, apšuvums un individuāla galdniecība.",
     "ru":"Частный деревянный дом — каркас, обшивка и столярка на заказ."},
   "description":{
     "en":"A private timber home in southern Sweden, from frame to finish.",
     "lv":"Privāta koka māja Zviedrijas dienvidos — no karkasa līdz apdarei.",
     "ru":"Частный деревянный дом на юге Швеции — от каркаса до отделки."}
 }$j$::jsonb,
 $j${
   "title":{"en":"A timber home, frame to finish.","lv":"Koka māja — no karkasa līdz apdarei.","ru":"Деревянный дом — от каркаса до отделки."},
   "intro":{
     "en":"A private residence in southern Sweden built in wood — structural framing, weatherproof cladding, and interior finishing by one team.",
     "lv":"Privāta dzīvojamā māja Zviedrijas dienvidos, būvēta kokā — nesošais karkass, laikapstākļiem izturīgs apšuvums un iekšdarbu apdare vienas komandas izpildījumā.",
     "ru":"Частный дом на юге Швеции, построенный из дерева, — несущий каркас, погодостойкая обшивка и внутренняя отделка силами одной команды."},
   "items":[
     {"number":"01",
      "title":{"en":"Timber framing","lv":"Koka karkass","ru":"Деревянный каркас"},
      "description":{"en":"The structural frame, set out and raised.","lv":"Nesošais karkass — izlikts un uzstādīts.","ru":"Несущий каркас — разметка и монтаж."},
      "bullets":[
        {"en":"Post & beam frame","lv":"Statu un siju karkass","ru":"Стоечно-балочный каркас"},
        {"en":"Roof structure","lv":"Jumta konstrukcija","ru":"Конструкция крыши"},
        {"en":"Engineered connections","lv":"Inženiertehniskie savienojumi","ru":"Инженерные соединения"}]},
     {"number":"02",
      "title":{"en":"Envelope & cladding","lv":"Apvalks un apšuvums","ru":"Оболочка и обшивка"},
      "description":{"en":"A weatherproof shell for Nordic winters.","lv":"Laikapstākļiem izturīgs apvalks Ziemeļvalstu ziemām.","ru":"Защищённая от непогоды оболочка для северных зим."},
      "bullets":[
        {"en":"Ventilated cladding","lv":"Vēdināms apšuvums","ru":"Вентилируемая обшивка"},
        {"en":"Membranes & insulation","lv":"Membrānas un izolācija","ru":"Мембраны и утепление"},
        {"en":"Windows & flashings","lv":"Logi un lāsenes","ru":"Окна и отливы"}]},
     {"number":"03",
      "title":{"en":"Interior finishing","lv":"Iekšdarbu apdare","ru":"Внутренняя отделка"},
      "description":{"en":"Warm, finished interiors in natural materials.","lv":"Silti, pabeigti interjeri dabīgos materiālos.","ru":"Тёплые, завершённые интерьеры из натуральных материалов."},
      "bullets":[
        {"en":"Timber panelling","lv":"Koka paneļi","ru":"Деревянные панели"},
        {"en":"Plaster & paint","lv":"Apmetums un krāsojums","ru":"Штукатурка и покраска"},
        {"en":"Flooring","lv":"Grīdas segumi","ru":"Напольные покрытия"}]},
     {"number":"04",
      "title":{"en":"Detailing","lv":"Detaļas","ru":"Детали"},
      "description":{"en":"The joinery that makes it a home.","lv":"Galdniecība, kas ēku padara par mājām.","ru":"Столярные детали, которые делают дом домом."},
      "bullets":[
        {"en":"Custom stairs","lv":"Individuālas kāpnes","ru":"Лестницы на заказ"},
        {"en":"Built-in furniture","lv":"Iebūvētās mēbeles","ru":"Встроенная мебель"},
        {"en":"Exterior terraces","lv":"Āra terases","ru":"Наружные террасы"}]}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

-- ===========================================================================
-- Seed: the six services from the design, trilingual. Re-runnable.
-- EN copy is taken verbatim from the design DCLogic states
-- (ShakurServiceDetail.dc.html, ShakurAdminPanel.dc.html); LV/RU translated
-- in the style of src/i18n.ts.
-- ===========================================================================
insert into public.services
  (slug, category, published, sort_order, cta_label, cta_link, cover, media,
   i18n, capabilities, extras)
values
('drywall', 'Construction', true, 1,
 $j${"en":"Book a drywall consult","lv":"Pieteikt ģipškartona konsultāciju","ru":"Записаться на консультацию по гипсокартону"}$j$::jsonb,
 '/contact', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/proj-rimi.png"},
   {"id":"m2","type":"video","src":"images/img-39bf.png"},
   {"id":"m3","type":"image","src":"images/home-interior.png"},
   {"id":"m4","type":"image","src":"images/proj-kepler.png"},
   {"id":"m5","type":"image","src":"images/proj-kuldiga.png"},
   {"id":"m6","type":"image","src":"images/img-553f.png"}
 ]$j$::jsonb,
 $j${
   "title":{"en":"Drywall & Partitions","lv":"Ģipškartons un starpsienas","ru":"Гипсокартон и перегородки"},
   "summary":{
     "en":"Precision drywall, partitions, and suspended ceilings that give your interiors clean lines and a paint-ready finish.",
     "lv":"Precīzs ģipškartons, starpsienas un piekaramie griesti, kas piešķir interjeram tīras līnijas un krāsošanai gatavu apdari.",
     "ru":"Точный монтаж гипсокартона, перегородок и подвесных потолков — чистые линии и готовая под покраску поверхность."},
   "description":{
     "en":"Our drywall crews build partitions, suspended ceilings, and acoustic walls to exact tolerances. We handle framing, boarding, jointing, and a paint-ready finish — coordinating closely with electrical and HVAC trades so nothing gets boxed in by mistake.\n\nEvery job starts with a site survey and a fixed, itemised quote. We protect adjacent surfaces, keep the site tidy, and document each stage for building control. A typical single-floor fit-out is completed in two to three weeks.\n\nWhether it is a single office partition or a full commercial floor, the same standards apply: straight lines, solid fixings, and a finish that is ready for the decorator the day we leave.",
     "lv":"Mūsu ģipškartona komandas būvē starpsienas, piekaramos griestus un akustiskās sienas ar precīzām pielaidēm. Mēs veicam karkasa montāžu, apšūšanu, špaktelēšanu un krāsošanai gatavu apdari — cieši koordinējoties ar elektrības un ventilācijas darbiem, lai nekas netiktu kļūdaini aizbūvēts.\n\nKatrs darbs sākas ar objekta apsekošanu un fiksētu, detalizētu tāmi. Mēs aizsargājam blakus esošās virsmas, uzturam objektu kārtībā un dokumentējam katru posmu būvuzraudzībai. Tipiska viena stāva izbūve tiek pabeigta divās līdz trīs nedēļās.\n\nVienalga, vai tā ir viena biroja starpsiena vai pilns komercstāvs — standarti ir vieni: taisnas līnijas, droši stiprinājumi un apdare, kas gatava krāsotājam jau mūsu aiziešanas dienā.",
     "ru":"Наши бригады возводят перегородки, подвесные потолки и акустические стены с точными допусками. Мы выполняем каркас, обшивку, шпаклёвку и готовую под покраску отделку — в тесной координации с электрикой и вентиляцией, чтобы ничего не оказалось случайно зашито.\n\nКаждая работа начинается с осмотра объекта и фиксированной, детальной сметы. Мы защищаем соседние поверхности, поддерживаем порядок на объекте и документируем каждый этап для стройнадзора. Типичная отделка одного этажа занимает две-три недели.\n\nБудь то одна офисная перегородка или целый коммерческий этаж — стандарты одни: ровные линии, надёжный крепёж и поверхность, готовая для маляра в день нашего ухода."}
 }$j$::jsonb,
 $j${
   "title":{
     "en":"End-to-end drywall and partition systems, built to spec.",
     "lv":"Pilna cikla ģipškartona un starpsienu sistēmas, būvētas pēc specifikācijas.",
     "ru":"Системы гипсокартона и перегородок полного цикла, построенные по спецификации."},
   "intro":{
     "en":"From first survey to final jointing, our crews cover the full scope — so you deal with one team, one standard, and one point of accountability.",
     "lv":"No pirmās apsekošanas līdz pēdējai šuvei mūsu komandas sedz visu apjomu — jūs strādājat ar vienu komandu, vienu standartu un vienu atbildīgo.",
     "ru":"От первого осмотра до последнего шва наши бригады закрывают весь объём — вы работаете с одной командой, одним стандартом и одной точкой ответственности."},
   "items":[
     {"number":"01",
      "title":{"en":"Framing & structure","lv":"Karkass un konstrukcija","ru":"Каркас и конструкция"},
      "description":{"en":"Metal and timber stud systems set out to your drawings.","lv":"Metāla un koka karkasa sistēmas, izliktas pēc jūsu rasējumiem.","ru":"Металлические и деревянные каркасные системы по вашим чертежам."},
      "bullets":[
        {"en":"Load-rated partitions","lv":"Slodzi nesošas starpsienas","ru":"Перегородки с расчётной нагрузкой"},
        {"en":"Curved & raked walls","lv":"Liektas un slīpas sienas","ru":"Криволинейные и наклонные стены"},
        {"en":"Service voids & bulkheads","lv":"Komunikāciju šahtas un aizsegi","ru":"Ниши для коммуникаций и короба"}]},
     {"number":"02",
      "title":{"en":"Boarding & acoustics","lv":"Apšuvums un akustika","ru":"Обшивка и акустика"},
      "description":{"en":"The right board for fire, moisture, and sound performance.","lv":"Pareizā plāksne ugunsdrošībai, mitrumam un skaņai.","ru":"Правильная плита для огнестойкости, влаги и звука."},
      "bullets":[
        {"en":"Fire-rated build-ups","lv":"Ugunsdrošas konstrukcijas","ru":"Огнестойкие конструкции"},
        {"en":"Acoustic & moisture board","lv":"Akustiskās un mitrumizturīgās plāksnes","ru":"Акустические и влагостойкие плиты"},
        {"en":"Insulation infill","lv":"Izolācijas pildījums","ru":"Заполнение изоляцией"}]},
     {"number":"03",
      "title":{"en":"Ceilings","lv":"Griesti","ru":"Потолки"},
      "description":{"en":"Suspended and MF ceilings with integrated services.","lv":"Piekaramie un MF griesti ar integrētām komunikācijām.","ru":"Подвесные и MF-потолки с интегрированными коммуникациями."},
      "bullets":[
        {"en":"Grid & MF systems","lv":"Režģu un MF sistēmas","ru":"Кассетные и MF-системы"},
        {"en":"Access panels","lv":"Revīzijas lūkas","ru":"Ревизионные люки"},
        {"en":"Lighting & HVAC cut-outs","lv":"Izgriezumi apgaismojumam un ventilācijai","ru":"Вырезы под освещение и вентиляцию"}]},
     {"number":"04",
      "title":{"en":"Finishing","lv":"Apdare","ru":"Отделка"},
      "description":{"en":"Taped, jointed, and skimmed to a decorator-ready face.","lv":"Špaktelēts, slīpēts un nogludināts līdz krāsotājam gatavai virsmai.","ru":"Швы проклеены, зашпаклёваны и выведены под маляра."},
      "bullets":[
        {"en":"Level-5 finish available","lv":"Pieejama Level-5 apdare","ru":"Доступна отделка Level-5"},
        {"en":"Corner & edge beads","lv":"Stūru un malu profili","ru":"Угловые и торцевые профили"},
        {"en":"Snag-free handover","lv":"Nodošana bez defektiem","ru":"Сдача без недоделок"}]}
   ]
 }$j$::jsonb,
 $j${
   "highlights":[
     {"title":{"en":"Fixed-price quotes","lv":"Fiksētas cenas tāmes","ru":"Сметы с фиксированной ценой"},
      "desc":{"en":"Itemised, no surprises after we survey.","lv":"Detalizētas, bez pārsteigumiem pēc apsekošanas.","ru":"Детальные, без сюрпризов после осмотра."}},
     {"title":{"en":"Trade coordination","lv":"Darbu koordinācija","ru":"Координация работ"},
      "desc":{"en":"We sequence around electrics and HVAC.","lv":"Mēs plānojam darbus ap elektriku un ventilāciju.","ru":"Мы выстраиваем график вокруг электрики и вентиляции."}},
     {"title":{"en":"Paint-ready finish","lv":"Krāsošanai gatava apdare","ru":"Поверхность под покраску"},
      "desc":{"en":"Decorator can start the day we leave.","lv":"Krāsotājs var sākt darbu mūsu aiziešanas dienā.","ru":"Маляр может начать в день нашего ухода."}}
   ],
   "facts":[
     {"label":{"en":"Typical timeline","lv":"Tipiskais termiņš","ru":"Типичный срок"},
      "value":{"en":"2–3 weeks / floor","lv":"2–3 nedēļas / stāvs","ru":"2–3 недели / этаж"}},
     {"label":{"en":"Warranty","lv":"Garantija","ru":"Гарантия"},
      "value":{"en":"5 years workmanship","lv":"5 gadu garantija darbiem","ru":"5 лет гарантии на работы"}},
     {"label":{"en":"Coverage","lv":"Darbības reģions","ru":"Регион работы"},
      "value":{"en":"Latvia & Sweden","lv":"Latvija un Zviedrija","ru":"Латвия и Швеция"}}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

insert into public.services
  (slug, category, published, sort_order, cta_label, cta_link, cover, media,
   i18n, capabilities, extras)
values
('interior-finishing', 'Finishing', true, 2,
 $j${"en":"Discuss finishing","lv":"Apspriest apdari","ru":"Обсудить отделку"}$j$::jsonb,
 '/contact', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/home-interior.png"},
   {"id":"m2","type":"image","src":"images/proj-kuldiga.png"},
   {"id":"m3","type":"video","src":"images/proj-moho.png"}
 ]$j$::jsonb,
 $j${
   "title":{"en":"Interior Finishing","lv":"Iekšdarbu apdare","ru":"Внутренняя отделка"},
   "summary":{
     "en":"Plaster, paint, tiling, and detailing that make a space feel complete.",
     "lv":"Apmetums, krāsojums, flīzēšana un detaļas, kas telpu padara pabeigtu.",
     "ru":"Штукатурка, покраска, плитка и детали, которые делают пространство завершённым."},
   "description":{
     "en":"From skim-coat plastering to feature tiling and final decoration, our finishing team delivers the details clients actually notice. We colour-match, protect adjacent surfaces, and leave every room ready to furnish.",
     "lv":"No nogludinošā apmetuma līdz akcentu flīzējumam un gala dekorēšanai — mūsu apdares komanda nodrošina detaļas, ko klienti patiešām pamana. Mēs piemeklējam toņus, aizsargājam blakus esošās virsmas un atstājam katru telpu gatavu iekārtošanai.",
     "ru":"От финишной штукатурки до акцентной плитки и финальной отделки — наша команда выполняет те детали, которые клиенты действительно замечают. Мы подбираем цвета, защищаем соседние поверхности и оставляем каждую комнату готовой к обустройству."}
 }$j$::jsonb,
 $j${
   "title":{
     "en":"Complete interior finishing, from bare shell to handover.",
     "lv":"Pilna iekšdarbu apdare — no neapdarinātas telpas līdz nodošanai.",
     "ru":"Полная внутренняя отделка — от черновой коробки до сдачи."},
   "intro":{
     "en":"One finishing team covers every surface — plaster, paint, tile, and detail — so the standard stays consistent from room to room.",
     "lv":"Viena apdares komanda sedz katru virsmu — apmetumu, krāsojumu, flīzes un detaļas — lai standarts paliktu vienāds katrā telpā.",
     "ru":"Одна команда закрывает каждую поверхность — штукатурку, покраску, плитку и детали, — чтобы стандарт оставался одинаковым из комнаты в комнату."},
   "items":[
     {"number":"01",
      "title":{"en":"Plastering & skim","lv":"Apmešana un gludināšana","ru":"Штукатурка и шпаклёвка"},
      "description":{"en":"Flat, crack-free walls and ceilings ready for decoration.","lv":"Līdzenas sienas un griesti bez plaisām, gatavi dekorēšanai.","ru":"Ровные стены и потолки без трещин, готовые к отделке."},
      "bullets":[
        {"en":"Skim-coat & full plaster","lv":"Nogludinošais un pilnais apmetums","ru":"Финишная и полная штукатурка"},
        {"en":"Crack & corner repair","lv":"Plaisu un stūru remonts","ru":"Ремонт трещин и углов"},
        {"en":"Primed, paint-ready surfaces","lv":"Gruntētas, krāsošanai gatavas virsmas","ru":"Загрунтованные поверхности под покраску"}]},
     {"number":"02",
      "title":{"en":"Painting & decoration","lv":"Krāsošana un dekorēšana","ru":"Покраска и декорирование"},
      "description":{"en":"Clean lines, even coverage, and colour-matched finishes.","lv":"Tīras līnijas, vienmērīgs klājums un saskaņoti toņi.","ru":"Чистые линии, ровное покрытие и подобранные цвета."},
      "bullets":[
        {"en":"Interior paint systems","lv":"Iekšdarbu krāsu sistēmas","ru":"Системы интерьерной окраски"},
        {"en":"Feature walls & accents","lv":"Akcentu sienas","ru":"Акцентные стены"},
        {"en":"Protective final coats","lv":"Aizsargājošie gala pārklājumi","ru":"Защитные финишные слои"}]},
     {"number":"03",
      "title":{"en":"Tiling","lv":"Flīzēšana","ru":"Плиточные работы"},
      "description":{"en":"Precision tiling for bathrooms, kitchens, and floors.","lv":"Precīza flīzēšana vannas istabām, virtuvēm un grīdām.","ru":"Точная укладка плитки для ванных, кухонь и полов."},
      "bullets":[
        {"en":"Wall & floor tiling","lv":"Sienu un grīdu flīzēšana","ru":"Плитка на стены и пол"},
        {"en":"Waterproofing & tanking","lv":"Hidroizolācija","ru":"Гидроизоляция"},
        {"en":"Grout & silicone detailing","lv":"Šuvju un silikona apstrāde","ru":"Затирка и силиконовые швы"}]},
     {"number":"04",
      "title":{"en":"Final detailing","lv":"Gala detaļas","ru":"Финальные детали"},
      "description":{"en":"The last five percent that makes the space feel complete.","lv":"Pēdējie pieci procenti, kas telpu padara pabeigtu.","ru":"Последние пять процентов, которые делают пространство завершённым."},
      "bullets":[
        {"en":"Skirting & trim","lv":"Grīdlīstes un apdares līstes","ru":"Плинтусы и наличники"},
        {"en":"Sealant & caulking","lv":"Hermētiķis un šuvju aizpildīšana","ru":"Герметизация швов"},
        {"en":"Snag-free handover","lv":"Nodošana bez defektiem","ru":"Сдача без недоделок"}]}
   ]
 }$j$::jsonb,
 $j${
   "highlights":[
     {"title":{"en":"Consistent standard","lv":"Vienots standarts","ru":"Единый стандарт"},
      "desc":{"en":"One crew, one quality bar in every room.","lv":"Viena komanda, viena kvalitātes latiņa katrā telpā.","ru":"Одна бригада, одна планка качества в каждой комнате."}},
     {"title":{"en":"Clean sites","lv":"Tīri objekti","ru":"Чистые объекты"},
      "desc":{"en":"Surfaces protected, dust controlled, tidied daily.","lv":"Virsmas aizsargātas, putekļi kontrolēti, ikdienas uzkopšana.","ru":"Поверхности защищены, пыль под контролем, ежедневная уборка."}},
     {"title":{"en":"Colour matching","lv":"Toņu piemeklēšana","ru":"Подбор цвета"},
      "desc":{"en":"We match existing finishes exactly.","lv":"Mēs precīzi piemeklējam esošo apdari.","ru":"Мы точно подбираем существующую отделку."}}
   ],
   "facts":[
     {"label":{"en":"Typical timeline","lv":"Tipiskais termiņš","ru":"Типичный срок"},
      "value":{"en":"1–4 weeks / unit","lv":"1–4 nedēļas / objekts","ru":"1–4 недели / объект"}},
     {"label":{"en":"Warranty","lv":"Garantija","ru":"Гарантия"},
      "value":{"en":"5 years workmanship","lv":"5 gadu garantija darbiem","ru":"5 лет гарантии на работы"}},
     {"label":{"en":"Coverage","lv":"Darbības reģions","ru":"Регион работы"},
      "value":{"en":"Latvia & Sweden","lv":"Latvija un Zviedrija","ru":"Латвия и Швеция"}}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

insert into public.services
  (slug, category, published, sort_order, cta_label, cta_link, cover, media,
   i18n, capabilities, extras)
values
('wood-construction', 'Construction', true, 3,
 $j${"en":"Start a timber project","lv":"Sākt koka projektu","ru":"Начать деревянный проект"}$j$::jsonb,
 '/contact', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/proj-moho.png"},
   {"id":"m2","type":"image","src":"images/img-575d.png"}
 ]$j$::jsonb,
 $j${
   "title":{"en":"Wood Construction","lv":"Koka konstrukcijas","ru":"Деревянное строительство"},
   "summary":{
     "en":"Timber framing, cladding, and bespoke joinery built to last.",
     "lv":"Koka karkasi, apšuvums un individuāla galdniecība, kas kalpo ilgi.",
     "ru":"Деревянные каркасы, обшивка и столярные изделия на заказ, построенные надолго."},
   "description":{
     "en":"We design and build timber structures — from framing and façade cladding to custom interior joinery. Sustainably sourced material, weatherproof detailing, and craftsmanship that ages well.",
     "lv":"Mēs projektējam un būvējam koka konstrukcijas — no karkasa un fasādes apšuvuma līdz individuālai interjera galdniecībai. Ilgtspējīgi iegūts materiāls, laikapstākļiem izturīga detalizācija un meistarība, kas laika gaitā tikai iegūst.",
     "ru":"Мы проектируем и строим деревянные конструкции — от каркаса и фасадной обшивки до столярных изделий для интерьера. Экологичный материал, стойкая к погоде детализация и мастерство, которое хорошо стареет."}
 }$j$::jsonb,
 $j${
   "title":{
     "en":"Timber structures and joinery, from frame to finish.",
     "lv":"Koka konstrukcijas un galdniecība — no karkasa līdz apdarei.",
     "ru":"Деревянные конструкции и столярка — от каркаса до отделки."},
   "intro":{
     "en":"We build in wood at every scale — structural frames, weatherproof façades, and the bespoke joinery that gives a project character.",
     "lv":"Mēs būvējam kokā jebkurā mērogā — nesošos karkasus, laikapstākļiem izturīgas fasādes un individuālu galdniecību, kas projektam piešķir raksturu.",
     "ru":"Мы строим из дерева в любом масштабе — несущие каркасы, защищённые от погоды фасады и столярные изделия, придающие проекту характер."},
   "items":[
     {"number":"01",
      "title":{"en":"Structural framing","lv":"Nesošais karkass","ru":"Несущий каркас"},
      "description":{"en":"Load-bearing timber frames set out to engineer drawings.","lv":"Nesošie koka karkasi pēc inženiera rasējumiem.","ru":"Несущие деревянные каркасы по чертежам инженера."},
      "bullets":[
        {"en":"Post & beam structures","lv":"Statu un siju konstrukcijas","ru":"Стоечно-балочные конструкции"},
        {"en":"Roof & floor framing","lv":"Jumta un pārsegumu karkasi","ru":"Каркасы крыш и перекрытий"},
        {"en":"Engineered timber (CLT, glulam)","lv":"Inženierkoksne (CLT, līmētā koksne)","ru":"Инженерная древесина (CLT, клеёный брус)"}]},
     {"number":"02",
      "title":{"en":"Cladding & façades","lv":"Apšuvums un fasādes","ru":"Обшивка и фасады"},
      "description":{"en":"Weatherproof envelopes with clean, lasting detailing.","lv":"Laikapstākļiem izturīgs apvalks ar tīru, noturīgu detalizāciju.","ru":"Защищённая от погоды оболочка с чистой, долговечной детализацией."},
      "bullets":[
        {"en":"Ventilated façade systems","lv":"Vēdināmās fasādes sistēmas","ru":"Вентилируемые фасадные системы"},
        {"en":"Board & panel cladding","lv":"Dēļu un paneļu apšuvums","ru":"Обшивка доской и панелями"},
        {"en":"Membranes & flashings","lv":"Membrānas un lāsenes","ru":"Мембраны и отливы"}]},
     {"number":"03",
      "title":{"en":"Bespoke joinery","lv":"Individuāla galdniecība","ru":"Столярка на заказ"},
      "description":{"en":"Custom carpentry built to millimetre tolerances.","lv":"Individuāla galdniecība ar milimetru precizitāti.","ru":"Столярные изделия с миллиметровой точностью."},
      "bullets":[
        {"en":"Stairs & balustrades","lv":"Kāpnes un margas","ru":"Лестницы и ограждения"},
        {"en":"Built-in furniture","lv":"Iebūvētās mēbeles","ru":"Встроенная мебель"},
        {"en":"Doors & window surrounds","lv":"Durvju un logu apdares","ru":"Дверные и оконные обрамления"}]},
     {"number":"04",
      "title":{"en":"Treatment & finish","lv":"Apstrāde un apdare","ru":"Обработка и отделка"},
      "description":{"en":"Sanded, sealed, and protected against wear and weather.","lv":"Slīpēts, noslēgts un aizsargāts pret nodilumu un laikapstākļiem.","ru":"Отшлифовано, покрыто и защищено от износа и погоды."},
      "bullets":[
        {"en":"Fire & rot treatment","lv":"Uguns un trupes aizsardzība","ru":"Огне- и биозащита"},
        {"en":"Oils, stains & lacquers","lv":"Eļļas, beices un lakas","ru":"Масла, морилки и лаки"},
        {"en":"UV & moisture protection","lv":"UV un mitruma aizsardzība","ru":"Защита от УФ и влаги"}]}
   ]
 }$j$::jsonb,
 $j${
   "highlights":[
     {"title":{"en":"Sustainable timber","lv":"Ilgtspējīga koksne","ru":"Экологичная древесина"},
      "desc":{"en":"Certified, responsibly sourced material.","lv":"Sertificēts, atbildīgi iegūts materiāls.","ru":"Сертифицированный, ответственно заготовленный материал."}},
     {"title":{"en":"Weatherproof detailing","lv":"Laikapstākļiem izturīga detalizācija","ru":"Погодостойкая детализация"},
      "desc":{"en":"Built for Baltic and Nordic winters.","lv":"Būvēts Baltijas un Ziemeļvalstu ziemām.","ru":"Построено для балтийских и северных зим."}},
     {"title":{"en":"Craftsmanship","lv":"Meistarība","ru":"Мастерство"},
      "desc":{"en":"Joinery that ages well.","lv":"Galdniecība, kas laika gaitā tikai iegūst.","ru":"Столярка, которая хорошо стареет."}}
   ],
   "facts":[
     {"label":{"en":"Typical timeline","lv":"Tipiskais termiņš","ru":"Типичный срок"},
      "value":{"en":"4–12 weeks / build","lv":"4–12 nedēļas / būve","ru":"4–12 недель / объект"}},
     {"label":{"en":"Warranty","lv":"Garantija","ru":"Гарантия"},
      "value":{"en":"5 years workmanship","lv":"5 gadu garantija darbiem","ru":"5 лет гарантии на работы"}},
     {"label":{"en":"Coverage","lv":"Darbības reģions","ru":"Регион работы"},
      "value":{"en":"Latvia & Sweden","lv":"Latvija un Zviedrija","ru":"Латвия и Швеция"}}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

insert into public.services
  (slug, category, published, sort_order, cta_label, cta_link, cover, media,
   i18n, capabilities, extras)
values
('masonry', 'Construction', true, 4,
 $j${"en":"Request a survey","lv":"Pieprasīt apsekošanu","ru":"Заказать обследование"}$j$::jsonb,
 '/contact', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/img-553f.png"}
 ]$j$::jsonb,
 $j${
   "title":{"en":"Masonry & Structural","lv":"Mūrniecība un konstrukcijas","ru":"Каменные и конструктивные работы"},
   "summary":{
     "en":"Brick, block, and concrete works engineered for the long term.",
     "lv":"Ķieģeļu, bloku un betona darbi, kas projektēti ilgtermiņam.",
     "ru":"Кирпич, блоки и бетон — работы, рассчитанные на долгий срок."},
   "description":{
     "en":"Load-bearing walls, foundations, and structural repairs delivered by certified masons. We work to engineer drawings and document every stage for building control.",
     "lv":"Nesošās sienas, pamati un konstrukciju remonti, ko veic sertificēti mūrnieki. Mēs strādājam pēc inženiera rasējumiem un dokumentējam katru posmu būvuzraudzībai.",
     "ru":"Несущие стены, фундаменты и ремонт конструкций силами сертифицированных каменщиков. Мы работаем по чертежам инженера и документируем каждый этап для стройнадзора."}
 }$j$::jsonb,
 $j${
   "title":{
     "en":"Brick, block, and concrete engineered for the long term.",
     "lv":"Ķieģelis, bloki un betons, projektēti ilgtermiņam.",
     "ru":"Кирпич, блоки и бетон, рассчитанные на долгий срок."},
   "intro":{
     "en":"Certified masons working to engineer drawings — with every stage documented for building control.",
     "lv":"Sertificēti mūrnieki, kas strādā pēc inženiera rasējumiem — katrs posms dokumentēts būvuzraudzībai.",
     "ru":"Сертифицированные каменщики, работающие по чертежам инженера, — каждый этап документируется для стройнадзора."},
   "items":[
     {"number":"01",
      "title":{"en":"Load-bearing walls","lv":"Nesošās sienas","ru":"Несущие стены"},
      "description":{"en":"Structural brick and blockwork to engineer specification.","lv":"Nesošais ķieģeļu un bloku mūris pēc inženiera specifikācijas.","ru":"Несущая кирпичная и блочная кладка по спецификации инженера."},
      "bullets":[
        {"en":"Brick & block coursing","lv":"Ķieģeļu un bloku rindojums","ru":"Кирпичные и блочные ряды"},
        {"en":"Reinforced masonry","lv":"Stiegrots mūris","ru":"Армированная кладка"},
        {"en":"Lintels & openings","lv":"Pārsedzes un ailes","ru":"Перемычки и проёмы"}]},
     {"number":"02",
      "title":{"en":"Foundations","lv":"Pamati","ru":"Фундаменты"},
      "description":{"en":"Groundwork and concrete bases done right the first time.","lv":"Zemes darbi un betona pamatnes, izdarītas pareizi pirmajā reizē.","ru":"Земляные работы и бетонные основания, сделанные правильно с первого раза."},
      "bullets":[
        {"en":"Strip & pad foundations","lv":"Lentveida un punktveida pamati","ru":"Ленточные и столбчатые фундаменты"},
        {"en":"Reinforced slabs","lv":"Stiegrotas plātnes","ru":"Армированные плиты"},
        {"en":"Damp-proofing","lv":"Hidroizolācija","ru":"Гидроизоляция"}]},
     {"number":"03",
      "title":{"en":"Structural repair","lv":"Konstrukciju remonts","ru":"Ремонт конструкций"},
      "description":{"en":"Stabilising and restoring existing structures.","lv":"Esošo konstrukciju stabilizēšana un atjaunošana.","ru":"Стабилизация и восстановление существующих конструкций."},
      "bullets":[
        {"en":"Crack stitching","lv":"Plaisu sašūšana","ru":"Сшивка трещин"},
        {"en":"Underpinning","lv":"Pamatu pastiprināšana","ru":"Усиление фундаментов"},
        {"en":"Wall tie replacement","lv":"Sienu enkuru nomaiņa","ru":"Замена стенных связей"}]},
     {"number":"04",
      "title":{"en":"Pointing & sealing","lv":"Šuvošana un hermetizācija","ru":"Расшивка и герметизация"},
      "description":{"en":"Weather-tested joints and clean façades.","lv":"Laikapstākļos pārbaudītas šuves un tīras fasādes.","ru":"Проверенные погодой швы и чистые фасады."},
      "bullets":[
        {"en":"Repointing","lv":"Šuvju atjaunošana","ru":"Обновление швов"},
        {"en":"Expansion joints","lv":"Deformācijas šuves","ru":"Деформационные швы"},
        {"en":"Water-repellent sealing","lv":"Ūdeni atgrūdoša apstrāde","ru":"Водоотталкивающая обработка"}]}
   ]
 }$j$::jsonb,
 $j${
   "highlights":[
     {"title":{"en":"Certified masons","lv":"Sertificēti mūrnieki","ru":"Сертифицированные каменщики"},
      "desc":{"en":"Qualified crews on every structural job.","lv":"Kvalificētas komandas katrā konstrukciju darbā.","ru":"Квалифицированные бригады на каждой конструктивной работе."}},
     {"title":{"en":"To engineer drawings","lv":"Pēc inženiera rasējumiem","ru":"По чертежам инженера"},
      "desc":{"en":"We build exactly to the structural spec.","lv":"Mēs būvējam precīzi pēc konstrukciju specifikācijas.","ru":"Мы строим точно по конструктивной спецификации."}},
     {"title":{"en":"Documented stages","lv":"Dokumentēti posmi","ru":"Документированные этапы"},
      "desc":{"en":"Every stage recorded for building control.","lv":"Katrs posms fiksēts būvuzraudzībai.","ru":"Каждый этап фиксируется для стройнадзора."}}
   ],
   "facts":[
     {"label":{"en":"Typical timeline","lv":"Tipiskais termiņš","ru":"Типичный срок"},
      "value":{"en":"2–8 weeks / phase","lv":"2–8 nedēļas / posms","ru":"2–8 недель / этап"}},
     {"label":{"en":"Warranty","lv":"Garantija","ru":"Гарантия"},
      "value":{"en":"5 years workmanship","lv":"5 gadu garantija darbiem","ru":"5 лет гарантии на работы"}},
     {"label":{"en":"Coverage","lv":"Darbības reģions","ru":"Регион работы"},
      "value":{"en":"Latvia & Sweden","lv":"Latvija un Zviedrija","ru":"Латвия и Швеция"}}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

insert into public.services
  (slug, category, published, sort_order, cta_label, cta_link, cover, media,
   i18n, capabilities, extras)
values
('flooring', 'Finishing', false, 5,
 $j${"en":"Get a flooring quote","lv":"Saņemt grīdas tāmi","ru":"Получить смету на полы"}$j$::jsonb,
 '/contact', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/img-771e.png"}
 ]$j$::jsonb,
 $j${
   "title":{"en":"Flooring","lv":"Grīdas segumi","ru":"Напольные покрытия"},
   "summary":{
     "en":"Screeds, hardwood, laminate, and tile — level, quiet, and durable.",
     "lv":"Klons, parkets, lamināts un flīzes — līdzeni, klusi un izturīgi.",
     "ru":"Стяжка, паркет, ламинат и плитка — ровно, тихо и долговечно."},
   "description":{
     "en":"Subfloor preparation, self-levelling screeds, and the finished floor of your choice. We measure moisture, plan expansion, and guarantee a flat, quiet result.",
     "lv":"Pamatnes sagatavošana, pašizlīdzinošais klons un jūsu izvēlētais grīdas segums. Mēs mērām mitrumu, plānojam deformācijas šuves un garantējam līdzenu, klusu rezultātu.",
     "ru":"Подготовка основания, самовыравнивающаяся стяжка и финишное покрытие на ваш выбор. Мы измеряем влажность, планируем деформационные зазоры и гарантируем ровный, тихий результат."}
 }$j$::jsonb,
 $j${
   "title":{
     "en":"Level, quiet, durable floors — from screed to skirting.",
     "lv":"Līdzenas, klusas, izturīgas grīdas — no klona līdz grīdlīstei.",
     "ru":"Ровные, тихие, долговечные полы — от стяжки до плинтуса."},
   "intro":{
     "en":"We prepare the substrate properly, then lay the finished floor of your choice — measured, moisture-checked, and guaranteed flat.",
     "lv":"Mēs pareizi sagatavojam pamatni un tad ieklājam jūsu izvēlēto segumu — izmērītu, mitruma pārbaudītu un garantēti līdzenu.",
     "ru":"Мы правильно готовим основание, затем укладываем выбранное вами покрытие — с замерами, контролем влажности и гарантией ровности."},
   "items":[
     {"number":"01",
      "title":{"en":"Subfloor preparation","lv":"Pamatnes sagatavošana","ru":"Подготовка основания"},
      "description":{"en":"A flat, dry, sound base under every finish.","lv":"Līdzena, sausa un stabila pamatne zem katra seguma.","ru":"Ровное, сухое и прочное основание под каждым покрытием."},
      "bullets":[
        {"en":"Moisture measurement","lv":"Mitruma mērījumi","ru":"Замеры влажности"},
        {"en":"Self-levelling screeds","lv":"Pašizlīdzinošais klons","ru":"Самовыравнивающаяся стяжка"},
        {"en":"Acoustic underlays","lv":"Akustiskās apakšklājas","ru":"Акустические подложки"}]},
     {"number":"02",
      "title":{"en":"Hard flooring","lv":"Cietie segumi","ru":"Твёрдые покрытия"},
      "description":{"en":"Hardwood, laminate, and engineered boards.","lv":"Parkets, lamināts un inženierdēļi.","ru":"Паркет, ламинат и инженерная доска."},
      "bullets":[
        {"en":"Hardwood & parquet","lv":"Masīvkoks un parkets","ru":"Массив и паркет"},
        {"en":"Laminate & vinyl","lv":"Lamināts un vinils","ru":"Ламинат и винил"},
        {"en":"Expansion planning","lv":"Deformācijas šuvju plānošana","ru":"Планирование зазоров"}]},
     {"number":"03",
      "title":{"en":"Tile & stone","lv":"Flīzes un akmens","ru":"Плитка и камень"},
      "description":{"en":"Precision-set tile for wet and high-traffic areas.","lv":"Precīzi ieklātas flīzes mitrām un intensīvi lietotām zonām.","ru":"Точная укладка плитки для влажных и проходных зон."},
      "bullets":[
        {"en":"Large-format tile","lv":"Liela formāta flīzes","ru":"Крупноформатная плитка"},
        {"en":"Underfloor heating systems","lv":"Grīdas apsildes sistēmas","ru":"Системы тёплого пола"},
        {"en":"Waterproof wet rooms","lv":"Hidroizolētas mitrās telpas","ru":"Гидроизолированные влажные зоны"}]},
     {"number":"04",
      "title":{"en":"Finishing & trim","lv":"Apdare un līstes","ru":"Отделка и профили"},
      "description":{"en":"The details that complete the floor.","lv":"Detaļas, kas grīdu padara pabeigtu.","ru":"Детали, завершающие пол."},
      "bullets":[
        {"en":"Skirting & profiles","lv":"Grīdlīstes un profili","ru":"Плинтусы и профили"},
        {"en":"Thresholds & transitions","lv":"Sliekšņi un pārejas","ru":"Пороги и переходы"},
        {"en":"Sealing & inspection","lv":"Hermetizācija un pārbaude","ru":"Герметизация и проверка"}]}
   ]
 }$j$::jsonb,
 $j${
   "highlights":[
     {"title":{"en":"Moisture-safe","lv":"Mitruma drošība","ru":"Контроль влажности"},
      "desc":{"en":"We measure before we lay.","lv":"Mēs mērām, pirms klājam.","ru":"Мы измеряем, прежде чем укладывать."}},
     {"title":{"en":"Flat guarantee","lv":"Līdzenuma garantija","ru":"Гарантия ровности"},
      "desc":{"en":"Level results with no creaks.","lv":"Līdzens rezultāts bez čīkstēšanas.","ru":"Ровный результат без скрипов."}},
     {"title":{"en":"All floor types","lv":"Visi segumu veidi","ru":"Все типы покрытий"},
      "desc":{"en":"One team for every finish.","lv":"Viena komanda katram segumam.","ru":"Одна команда для любого покрытия."}}
   ],
   "facts":[
     {"label":{"en":"Typical timeline","lv":"Tipiskais termiņš","ru":"Типичный срок"},
      "value":{"en":"3–10 days / unit","lv":"3–10 dienas / objekts","ru":"3–10 дней / объект"}},
     {"label":{"en":"Warranty","lv":"Garantija","ru":"Гарантия"},
      "value":{"en":"5 years workmanship","lv":"5 gadu garantija darbiem","ru":"5 лет гарантии на работы"}},
     {"label":{"en":"Coverage","lv":"Darbības reģions","ru":"Регион работы"},
      "value":{"en":"Latvia & Sweden","lv":"Latvija un Zviedrija","ru":"Латвия и Швеция"}}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

insert into public.services
  (slug, category, published, sort_order, cta_label, cta_link, cover, media,
   i18n, capabilities, extras)
values
('emergency', 'Support', true, 6,
 $j${"en":"Call emergency line","lv":"Zvanīt avārijas līnijai","ru":"Позвонить на аварийную линию"}$j$::jsonb,
 '/contact', 'm1',
 $j$[
   {"id":"m1","type":"image","src":"images/img-97b7.png"},
   {"id":"m2","type":"video","src":"images/img-9c88.png"}
 ]$j$::jsonb,
 $j${
   "title":{"en":"Emergency Services","lv":"Avārijas dienests","ru":"Аварийные работы"},
   "summary":{
     "en":"Rapid response for water, structural, and weather damage — around the clock.",
     "lv":"Ātra reaģēšana uz ūdens, konstrukciju un laikapstākļu bojājumiem — visu diennakti.",
     "ru":"Быстрое реагирование на повреждения от воды, конструкций и непогоды — круглосуточно."},
   "description":{
     "en":"When something fails, we stabilise fast. Our emergency crews handle water ingress, structural props, board-ups, and make-safe works 24/7, then plan the permanent repair.",
     "lv":"Kad kaut kas atsakās kalpot, mēs ātri stabilizējam situāciju. Mūsu avārijas komandas 24/7 novērš ūdens ieplūdi, uzstāda konstrukciju atbalstus, veic aizsegšanu un drošības darbus, un pēc tam plāno pastāvīgo remontu.",
     "ru":"Когда что-то выходит из строя, мы быстро стабилизируем ситуацию. Наши аварийные бригады 24/7 устраняют протечки, ставят подпорки, закрывают проёмы и выполняют работы по обеспечению безопасности, а затем планируют капитальный ремонт."}
 }$j$::jsonb,
 $j${
   "title":{
     "en":"Rapid response, around the clock.",
     "lv":"Ātra reaģēšana visu diennakti.",
     "ru":"Быстрое реагирование круглые сутки."},
   "intro":{
     "en":"When something fails we stabilise fast — then plan and deliver the permanent repair with the same crews.",
     "lv":"Kad kaut kas atsakās kalpot, mēs ātri stabilizējam — un pēc tam ar tām pašām komandām plānojam un veicam pastāvīgo remontu.",
     "ru":"Когда что-то выходит из строя, мы быстро стабилизируем ситуацию, а затем теми же бригадами планируем и выполняем капитальный ремонт."},
   "items":[
     {"number":"01",
      "title":{"en":"Emergency response","lv":"Avārijas reaģēšana","ru":"Аварийный выезд"},
      "description":{"en":"24/7 call-out for water, structural, and weather damage.","lv":"Izsaukumi 24/7 ūdens, konstrukciju un laikapstākļu bojājumiem.","ru":"Выезд 24/7 при повреждениях от воды, конструкций и непогоды."},
      "bullets":[
        {"en":"24/7 call-out line","lv":"Izsaukumu līnija 24/7","ru":"Линия вызова 24/7"},
        {"en":"Rapid site assessment","lv":"Ātra objekta novērtēšana","ru":"Быстрая оценка объекта"},
        {"en":"Immediate make-safe works","lv":"Tūlītēji drošības darbi","ru":"Немедленные работы по безопасности"}]},
     {"number":"02",
      "title":{"en":"Water damage","lv":"Ūdens bojājumi","ru":"Повреждения от воды"},
      "description":{"en":"Stopping ingress and drying the structure.","lv":"Ieplūdes apturēšana un konstrukcijas žāvēšana.","ru":"Остановка протечек и просушка конструкций."},
      "bullets":[
        {"en":"Leak detection & isolation","lv":"Noplūžu atrašana un izolēšana","ru":"Поиск и изоляция протечек"},
        {"en":"Structural drying","lv":"Konstrukciju žāvēšana","ru":"Просушка конструкций"},
        {"en":"Anti-mould treatment","lv":"Pretpelējuma apstrāde","ru":"Обработка от плесени"}]},
     {"number":"03",
      "title":{"en":"Structural stabilisation","lv":"Konstrukciju stabilizācija","ru":"Стабилизация конструкций"},
      "description":{"en":"Props, supports, and temporary works to code.","lv":"Atbalsti, balsti un pagaidu darbi atbilstoši normām.","ru":"Подпорки, опоры и временные работы по нормам."},
      "bullets":[
        {"en":"Structural propping","lv":"Konstrukciju atbalstīšana","ru":"Установка подпорок"},
        {"en":"Board-ups & enclosures","lv":"Aizsegšana un norobežošana","ru":"Закрытие проёмов и ограждения"},
        {"en":"Temporary weatherproofing","lv":"Pagaidu aizsardzība pret laikapstākļiem","ru":"Временная защита от непогоды"}]},
     {"number":"04",
      "title":{"en":"Permanent repair","lv":"Pastāvīgais remonts","ru":"Капитальный ремонт"},
      "description":{"en":"From make-safe to fully restored.","lv":"No drošības darbiem līdz pilnīgai atjaunošanai.","ru":"От обеспечения безопасности до полного восстановления."},
      "bullets":[
        {"en":"Scoped repair plan","lv":"Detalizēts remonta plāns","ru":"Детальный план ремонта"},
        {"en":"Insurance documentation","lv":"Dokumentācija apdrošināšanai","ru":"Документы для страховой"},
        {"en":"Full reinstatement","lv":"Pilnīga atjaunošana","ru":"Полное восстановление"}]}
   ]
 }$j$::jsonb,
 $j${
   "highlights":[
     {"title":{"en":"24/7 availability","lv":"Pieejamība 24/7","ru":"Доступность 24/7"},
      "desc":{"en":"Crews on call day and night.","lv":"Komandas gatavībā dienu un nakti.","ru":"Бригады на связи днём и ночью."}},
     {"title":{"en":"Fast stabilisation","lv":"Ātra stabilizācija","ru":"Быстрая стабилизация"},
      "desc":{"en":"Make-safe first, repair next.","lv":"Vispirms drošība, tad remonts.","ru":"Сначала безопасность, затем ремонт."}},
     {"title":{"en":"Insurance-ready","lv":"Gatavs apdrošināšanai","ru":"Готово для страховой"},
      "desc":{"en":"Documentation for every claim.","lv":"Dokumentācija katram atlīdzības pieteikumam.","ru":"Документы для каждого страхового случая."}}
   ],
   "facts":[
     {"label":{"en":"Response time","lv":"Reaģēšanas laiks","ru":"Время реагирования"},
      "value":{"en":"Under 2 hours (Rīga)","lv":"Līdz 2 stundām (Rīga)","ru":"До 2 часов (Рига)"}},
     {"label":{"en":"Availability","lv":"Pieejamība","ru":"Доступность"},
      "value":{"en":"24/7, year-round","lv":"24/7, visu gadu","ru":"24/7, круглый год"}},
     {"label":{"en":"Coverage","lv":"Darbības reģions","ru":"Регион работы"},
      "value":{"en":"Latvia","lv":"Latvija","ru":"Латвия"}}
   ]
 }$j$::jsonb)
on conflict (slug) do nothing;

-- ===========================================================================
-- Seed: availability defaults (design: Mon–Thu 09–17, Fri 09–15, Sat/Sun off,
-- 30 min slots, 10 min buffer, Europe/Riga) and site settings from the
-- ShakurAdminPanel state. Re-runnable.
-- ===========================================================================
insert into public.availability (id, week, slot_minutes, buffer_minutes, timezone, blockouts)
values
(1,
 $j${
   "Monday":    {"on": true,  "start": "09:00", "end": "17:00"},
   "Tuesday":   {"on": true,  "start": "09:00", "end": "17:00"},
   "Wednesday": {"on": true,  "start": "09:00", "end": "17:00"},
   "Thursday":  {"on": true,  "start": "09:00", "end": "17:00"},
   "Friday":    {"on": true,  "start": "09:00", "end": "15:00"},
   "Saturday":  {"on": false, "start": "10:00", "end": "14:00"},
   "Sunday":    {"on": false, "start": "10:00", "end": "14:00"}
 }$j$::jsonb,
 30, 10, 'Europe/Riga', '[]'::jsonb)
on conflict (id) do nothing;

insert into public.site_settings
  (id, title, tagline, email, phone, lang, announcement_enabled, announcement_text)
values
(1, 'SIA SHAKUR', 'Building excellence across the Baltics',
 'info@shakur.lv', '+371 20 000 000', 'English', true,
 'Emergency construction services available 24/7 — call now')
on conflict (id) do nothing;

-- ===========================================================================
-- v3: home_sections — Home-page CMS (the admin "Home page" view). One row per
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
-- v3: consultation_requests — hero "Request a Consultation" leads. Written
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
-- v3: media_assets — Home-CMS + gallery uploads (POST /api/media). Files land
-- in the api container's MEDIA_DIR first (served by nginx at /media/), then
-- replicate to the public `media` storage bucket in the background.
-- v4: videos are transcoded to h264+aac mp4 (+faststart) with an auto jpg
-- poster; `kind` distinguishes the rows, `poster_path` is null for images.
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
                     check (replication_status in ('pending', 'done', 'failed')),
  kind               text   not null default 'image'
                     check (kind in ('image', 'video')),
  poster_path        text                      -- '/media/<uuid>.jpg' for videos
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
-- v3 seed: all four home sections published with the design's homeCms
-- defaults (ShakurAdminPanel.dc.html state, copied verbatim incl. LV/RU).
-- Images are the repo's public/images/* presets. Re-runnable.
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

-- ===========================================================================
-- v4: site_logos — home marquee logos ("Trusted by" row 1 / "Working with"
-- row 2), managed in Settings ▸ Site settings. `img` is '/media/<file>' for
-- uploads or an images/... preset path.
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
-- v4 seed: the static LOGOS_ROW1 / LOGOS_ROW2 lists from src/data.ts. Only
-- when the table is empty (uuid PKs — ON CONFLICT can't dedupe), so
-- re-running never duplicates and never resurrects deleted logos.
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

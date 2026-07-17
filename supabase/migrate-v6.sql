-- SHAKUR — v5 → v6 in-place migration: self-hosted page-view analytics.
-- Re-runnable: every step is guarded. Fresh installs should use
-- supabase/schema.sql instead (it already contains everything below).
-- Run AFTER supabase/migrate-v5.sql.
--
-- Privacy stance: a page view stores the path, the referrer HOSTNAME (external
-- only), the UI language, a mobile/desktop flag and a RANDOM session-scoped
-- visit id. No cookies, no IP addresses, no user agents, nothing personal —
-- no consent banner needed.
--
-- Security stance: page_views is a WRITE-ONLY mailbox for the anon key. The
-- INSERT policy below is the only policy, so the public key can log a view
-- but can never read, change or delete one. The admin dashboard reads through
-- the two aggregate views, which are granted to authenticated only (views
-- run with their owner's rights and bypass RLS — hence the explicit revokes).

-- ===========================================================================
-- 1. page_views — one row per public page view
-- ===========================================================================
create table if not exists public.page_views (
  id         bigint generated always as identity primary key,
  path       text not null check (char_length(path) between 1 and 200),
  referrer   text check (referrer is null or char_length(referrer) <= 200),
  lang       text check (lang is null or char_length(lang) <= 8),
  device     text not null default 'desktop' check (device in ('mobile', 'desktop')),
  visit_id   text not null check (char_length(visit_id) between 8 and 40),
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx
  on public.page_views (created_at);

alter table public.page_views enable row level security;

drop policy if exists "anyone can log a page view" on public.page_views;
create policy "anyone can log a page view"
  on public.page_views for insert
  to anon, authenticated
  with check (true);
-- Deliberately NO select/update/delete policies on the table.

-- ===========================================================================
-- 2. Dashboard aggregates (last 90 days) — authenticated only
-- ===========================================================================
create or replace view public.page_view_daily as
  select created_at::date as day,
         device,
         count(*)::int as views,
         count(distinct visit_id)::int as visits
  from public.page_views
  where created_at > now() - interval '90 days'
  group by 1, 2;

create or replace view public.page_view_paths as
  select created_at::date as day,
         path,
         count(*)::int as views
  from public.page_views
  where created_at > now() - interval '90 days'
  group by 1, 2;

revoke all on public.page_view_daily from anon, public;
revoke all on public.page_view_paths from anon, public;
grant select on public.page_view_daily to authenticated;
grant select on public.page_view_paths to authenticated;

-- SHAKUR — v6 → v7: clear the Supabase security advisor's
-- "security_definer_view" findings on home_public, site_texts_public,
-- page_view_daily and page_view_paths. Re-runnable; run AFTER migrate-v6.sql.
--
-- Background: RLS lives on TABLES — a view cannot carry policies of its own.
-- Until now these four views deliberately ran with their owner's rights
-- (bypassing the base tables' RLS) to act as the filtered public read
-- surface. That works, but the advisor flags it because an owner-rights view
-- silently ignores RLS. This migration flips each view to
-- `security_invoker = on` — it now runs with the CALLER's rights — and gives
-- each caller exactly the surface the view used to expose, nothing more:
--
--   home_public        anon may read ONLY (section, published) of published
--   site_texts_public  rows / ONLY (key, published). The draft column is not
--                      in the column grant at all, so drafts stay unreadable
--                      even by querying the base tables directly.
--   page_view_daily    authenticated (admin) only, backed by a new
--   page_view_paths    authenticated SELECT policy on page_views. The anon
--                      key stays write-only on analytics: it can log a view
--                      but read nothing back (no policy → zero rows).

-- ===========================================================================
-- 1. home_public → security_invoker + narrow anon surface on home_sections
-- ===========================================================================
alter view public.home_public set (security_invoker = on);

revoke select on public.home_sections from anon;
grant select (section, published) on public.home_sections to anon;

drop policy if exists "anon read published home sections" on public.home_sections;
create policy "anon read published home sections"
  on public.home_sections for select
  to anon
  using (published is not null);

-- ===========================================================================
-- 2. site_texts_public → security_invoker + narrow anon surface on site_texts
-- ===========================================================================
alter view public.site_texts_public set (security_invoker = on);

revoke select on public.site_texts from anon;
grant select (key, published) on public.site_texts to anon;

drop policy if exists "anon read published site texts" on public.site_texts;
create policy "anon read published site texts"
  on public.site_texts for select
  to anon
  using (published is not null);

-- ===========================================================================
-- 3. analytics aggregates → security_invoker; admin may read page_views
-- ===========================================================================
alter view public.page_view_daily set (security_invoker = on);
alter view public.page_view_paths set (security_invoker = on);

drop policy if exists "authenticated read page views" on public.page_views;
create policy "authenticated read page views"
  on public.page_views for select
  to authenticated
  using (true);

-- anon SELECT on the two aggregate views was already revoked in migrate-v6;
-- re-assert in case this script runs on a hand-modified database.
revoke all on public.page_view_daily from anon, public;
revoke all on public.page_view_paths from anon, public;

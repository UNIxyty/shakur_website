-- SHAKUR — storage bucket for admin image uploads.
-- Run this in the Supabase SQL editor AFTER schema.sql.
--
-- The admin drawer uploads cover + gallery images here; the public site reads them.
-- Public read, authenticated write — the same shape as the projects table.

insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

drop policy if exists "public read project images" on storage.objects;
create policy "public read project images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-images');

drop policy if exists "authenticated upload project images" on storage.objects;
create policy "authenticated upload project images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images');

drop policy if exists "authenticated update project images" on storage.objects;
create policy "authenticated update project images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images');

drop policy if exists "authenticated delete project images" on storage.objects;
create policy "authenticated delete project images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images');

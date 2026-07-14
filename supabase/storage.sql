-- SHAKUR — storage bucket for admin media uploads (images + video).
-- Run this in the Supabase SQL editor AFTER schema.sql.
--
-- The admin drawer uploads covers + gallery media here (tus resumable uploads);
-- the public site reads them. Public read, authenticated write — the same
-- shape as the projects/services tables.

insert into storage.buckets (id, name, public, allowed_mime_types)
values ('project-images', 'project-images', true,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml',
              'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update
  set public             = excluded.public,
      -- v1 created the bucket without a mime allowlist; v2 adds video types.
      allowed_mime_types = excluded.allowed_mime_types;

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

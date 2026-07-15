-- SHAKUR — storage buckets for admin media uploads.
-- Run this in the Supabase SQL editor AFTER schema.sql.
--
-- `project-images`: gallery covers + media (tus resumable uploads, images +
-- video). `media` (v3): Home-CMS images — the server API stores the primary
-- copy locally (MEDIA_DIR, served at /media/) and replicates here in the
-- background so a fresh box can still serve the files. Public read,
-- authenticated write — the same shape as the projects/services tables.

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

-- ---------------------------------------------------------------------------
-- `media` — Home-CMS images (v3). POST /api/media uploads via the service key
-- (bypasses RLS); the policies mirror project-images so an authenticated
-- session could also write directly. Images only — matches the endpoint.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('media', 'media', true,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do update
  set public             = excluded.public,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read media" on storage.objects;
create policy "public read media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "authenticated upload media" on storage.objects;
create policy "authenticated upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

drop policy if exists "authenticated update media" on storage.objects;
create policy "authenticated update media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media');

drop policy if exists "authenticated delete media" on storage.objects;
create policy "authenticated delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');

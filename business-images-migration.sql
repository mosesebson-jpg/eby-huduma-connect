-- EBY HUDUMA CONNECT: Business image support
-- Run once in Supabase SQL Editor for the project used by config.js.

alter table public.businesses
  add column if not exists image_url text,
  add column if not exists storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-images',
  'business-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Business images are publicly readable" on storage.objects;
create policy "Business images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'business-images');

drop policy if exists "Users upload business images to own folder" on storage.objects;
create policy "Users upload business images to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own business images" on storage.objects;
create policy "Users delete own business images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

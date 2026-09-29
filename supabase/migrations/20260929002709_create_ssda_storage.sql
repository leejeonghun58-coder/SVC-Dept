insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'source-workbooks',
  'source-workbooks',
  false,
  209715200,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy source_workbooks_select_member
on storage.objects for select to authenticated
using (
  bucket_id = 'source-workbooks'
  and (select private.is_active_member())
);

create policy source_workbooks_insert_owner
on storage.objects for insert to authenticated
with check (
  bucket_id = 'source-workbooks'
  and (select private.is_active_member())
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

create policy source_workbooks_update_owner
on storage.objects for update to authenticated
using (
  bucket_id = 'source-workbooks'
  and (select private.is_active_member())
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id = 'source-workbooks'
  and (select private.is_active_member())
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

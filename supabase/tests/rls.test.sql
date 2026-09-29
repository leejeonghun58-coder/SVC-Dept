begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select ok(relrowsecurity, relname || ' has RLS enabled')
from pg_class
where oid in (
  'public.app_members'::regclass,
  'public.upload_jobs'::regclass,
  'public.data_versions'::regclass,
  'public.shipment_records'::regclass,
  'public.dv_records'::regclass,
  'public.customers'::regclass,
  'public.customer_mappings'::regclass,
  'public.validation_issues'::regclass,
  'public.monthly_item_summary'::regclass,
  'public.monthly_customer_summary'::regclass,
  'public.monthly_customer_item_summary'::regclass,
  'public.audit_events'::regclass
)
order by relname;

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000099', 'non-member@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000099', true);

select is((select count(*) from public.customers), 0::bigint, 'non-member cannot read customers');
select is((select count(*) from public.shipment_records), 0::bigint, 'non-member cannot read shipments');
select is((select count(*) from public.dv_records), 0::bigint, 'non-member cannot read DV');
select throws_ok(
  $$insert into public.upload_jobs (
      created_by, kind, file_name, size_bytes, sha256, storage_path
    ) values (
      '00000000-0000-0000-0000-000000000099', 'shipment', 'blocked.xlsx', 1,
      repeat('a', 64), '00000000-0000-0000-0000-000000000099/blocked.xlsx'
    )$$,
  '42501',
  null,
  'non-member cannot create upload jobs'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'source-workbooks'),
  0::bigint,
  'non-member cannot read storage objects'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('source-workbooks', '00000000-0000-0000-0000-000000000099/blocked.xlsx',
      '00000000-0000-0000-0000-000000000099')$$,
  '42501',
  null,
  'non-member cannot create storage objects'
);

reset role;
select * from finish();
rollback;

begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

select has_table('public'::name, 'app_members'::name);
select has_table('public'::name, 'upload_jobs'::name);
select has_table('public'::name, 'data_versions'::name);
select has_table('public'::name, 'shipment_records'::name);
select has_table('public'::name, 'dv_records'::name);
select has_table('public'::name, 'customers'::name);
select has_table('public'::name, 'customer_mappings'::name);
select has_table('public'::name, 'validation_issues'::name);
select has_table('public'::name, 'monthly_item_summary'::name);
select has_table('public'::name, 'monthly_customer_summary'::name);
select has_table('public'::name, 'monthly_customer_item_summary'::name);
select has_table('public'::name, 'audit_events'::name);

select col_type_is('public'::name, 'shipment_records'::name, 'quantity'::name, 'numeric(20,6)'::text);
select col_type_is('public'::name, 'shipment_records'::name, 'exact_amount'::name, 'numeric(20,4)'::text);
select col_type_is('public'::name, 'shipment_records'::name, 'total_cost'::name, 'numeric(20,4)'::text);
select col_type_is('public'::name, 'dv_records'::name, 'total_dv'::name, 'numeric(20,4)'::text);
select col_type_is('public'::name, 'dv_records'::name, 'total_revenue'::name, 'numeric(20,4)'::text);
select col_type_is('public'::name, 'shipment_records'::name, 'billing_month'::name, 'date'::text);
select col_type_is('public'::name, 'dv_records'::name, 'billing_month'::name, 'date'::text);
select col_type_is('public'::name, 'audit_events'::name, 'created_at'::name, 'timestamp with time zone'::text);

select fk_ok('public', 'shipment_records', 'data_version_id', 'public', 'data_versions', 'id');
select fk_ok('public', 'dv_records', 'data_version_id', 'public', 'data_versions', 'id');
select fk_ok('public', 'monthly_item_summary', 'data_version_id', 'public', 'data_versions', 'id');
select fk_ok('public', 'monthly_customer_summary', 'data_version_id', 'public', 'data_versions', 'id');
select fk_ok('public', 'monthly_customer_item_summary', 'data_version_id', 'public', 'data_versions', 'id');

select has_index('public'::name, 'app_members'::name, 'app_members_user_id_key'::name);
select has_index('public'::name, 'upload_jobs'::name, 'upload_jobs_created_by_idx'::name);
select has_index('public'::name, 'data_versions'::name, 'data_versions_active_kind_idx'::name);
select has_index('public'::name, 'shipment_records'::name, 'shipment_records_version_month_idx'::name);
select has_index('public'::name, 'shipment_records'::name, 'shipment_records_customer_month_idx'::name);
select has_index('public'::name, 'dv_records'::name, 'dv_records_version_month_idx'::name);
select has_index('public'::name, 'dv_records'::name, 'dv_records_customer_month_idx'::name);
select has_index('public'::name, 'monthly_item_summary'::name, 'monthly_item_summary_filter_idx'::name);
select has_index('public'::name, 'monthly_customer_summary'::name, 'monthly_customer_summary_filter_idx'::name);
select has_index('public'::name, 'monthly_customer_item_summary'::name, 'monthly_customer_item_summary_filter_idx'::name);

select is(
  (select public from storage.buckets where id = 'source-workbooks'),
  false,
  'source workbook bucket is private'
);
select is(
  (select file_size_limit from storage.buckets where id = 'source-workbooks'),
  209715200::bigint,
  'source workbook bucket accepts profiled workbook sizes'
);
select is(
  (select count(*) from storage.buckets where id = 'source-workbooks'),
  1::bigint,
  'exactly one source workbook bucket exists'
);

select * from finish();
rollback;

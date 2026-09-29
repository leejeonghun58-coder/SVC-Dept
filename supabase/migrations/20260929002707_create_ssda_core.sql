create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.app_members (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete cascade unique,
  email text not null,
  display_name text not null,
  role text not null default 'viewer'
    check (role in ('admin', 'operator', 'viewer')),
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index app_members_invited_by_idx
  on public.app_members(invited_by)
  where invited_by is not null;

create table public.upload_jobs (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('shipment', 'dv')),
  status text not null default 'waiting'
    check (status in (
      'waiting', 'uploading', 'processing', 'warning', 'failed',
      'ready_for_review', 'active', 'rolled_back'
    )),
  file_name text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 209715200),
  sha256 text not null check (sha256 ~ '^[0-9a-fA-F]{64}$'),
  storage_path text not null unique,
  progress_percent numeric(5,2) not null default 0
    check (progress_percent between 0 and 100),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (kind, sha256)
);

create index upload_jobs_created_by_idx on public.upload_jobs(created_by);
create index upload_jobs_status_created_idx on public.upload_jobs(status, created_at desc);

create table public.data_versions (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  upload_job_id bigint not null references public.upload_jobs(id) on delete restrict unique,
  kind text not null check (kind in ('shipment', 'dv')),
  status text not null default 'processing'
    check (status in (
      'processing', 'failed', 'warning', 'ready_for_review',
      'active', 'rolled_back'
    )),
  is_active boolean not null default false,
  is_official boolean not null default false,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-fA-F]{64}$'),
  row_count bigint not null default 0 check (row_count >= 0),
  warning_count bigint not null default 0 check (warning_count >= 0),
  error_count bigint not null default 0 check (error_count >= 0),
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  activated_at timestamptz,
  activated_by uuid references auth.users(id) on delete restrict,
  supersedes_version_id bigint references public.data_versions(id) on delete restrict,
  check (not is_official or (is_active and status = 'active'))
);

create unique index data_versions_active_kind_idx
  on public.data_versions(kind) where is_active;
create index data_versions_status_created_idx
  on public.data_versions(status, created_at desc);
create index data_versions_supersedes_idx
  on public.data_versions(supersedes_version_id)
  where supersedes_version_id is not null;
create index data_versions_activated_by_idx
  on public.data_versions(activated_by)
  where activated_by is not null;

create table public.customers (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  customer_no text not null,
  customer_name text not null,
  normalized_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_no, customer_name)
);

create index customers_name_idx on public.customers(customer_name);

create table public.customer_mappings (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  source_customer_no text not null,
  source_customer_name text not null,
  customer_id bigint not null references public.customers(id) on delete restrict,
  status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_customer_no, source_customer_name),
  check ((status = 'approved') = (approved_by is not null and approved_at is not null))
);

create index customer_mappings_customer_id_idx
  on public.customer_mappings(customer_id);
create index customer_mappings_status_idx
  on public.customer_mappings(status);
create index customer_mappings_approved_by_idx
  on public.customer_mappings(approved_by)
  where approved_by is not null;

create table public.shipment_records (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  data_version_id bigint not null references public.data_versions(id) on delete restrict,
  source_row_number bigint not null check (source_row_number > 0),
  source_row_hash text not null check (source_row_hash ~ '^[0-9a-fA-F]{64}$'),
  billing_month date not null check (billing_month = date_trunc('month', billing_month)::date),
  customer_no text not null,
  customer_name text not null,
  customer_id bigint references public.customers(id) on delete restrict,
  item_number text,
  item_description text,
  category text,
  sub_category text,
  svc_team text,
  model text,
  channel text,
  quantity numeric(20,6) not null,
  unit_cost numeric(20,4),
  unit_price numeric(20,4),
  exact_amount numeric(20,4),
  total_cost numeric(20,4),
  currency text not null default 'KRW' check (currency = 'KRW'),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (data_version_id, source_row_hash)
);

create index shipment_records_version_month_idx
  on public.shipment_records(data_version_id, billing_month);
create index shipment_records_customer_month_idx
  on public.shipment_records(customer_no, customer_name, billing_month);
create index shipment_records_item_month_idx
  on public.shipment_records(item_number, billing_month);
create index shipment_records_customer_id_idx
  on public.shipment_records(customer_id)
  where customer_id is not null;

create table public.dv_records (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  data_version_id bigint not null references public.data_versions(id) on delete restrict,
  source_row_number bigint not null check (source_row_number > 0),
  source_row_hash text not null check (source_row_hash ~ '^[0-9a-fA-F]{64}$'),
  billing_month date not null check (billing_month = date_trunc('month', billing_month)::date),
  customer_no text not null,
  customer_name text not null,
  customer_id bigint references public.customers(id) on delete restrict,
  item_number text not null,
  serial_no text,
  svc_team text,
  model text,
  channel text,
  total_dv numeric(20,4) not null,
  total_revenue numeric(20,4),
  currency text check (currency is null or currency = 'KRW'),
  is_exact_duplicate boolean not null default false,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (data_version_id, source_row_hash)
);

create index dv_records_version_month_idx
  on public.dv_records(data_version_id, billing_month);
create index dv_records_customer_month_idx
  on public.dv_records(customer_no, customer_name, billing_month);
create index dv_records_item_month_idx
  on public.dv_records(item_number, billing_month);
create index dv_records_customer_id_idx
  on public.dv_records(customer_id)
  where customer_id is not null;

create table public.validation_issues (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  data_version_id bigint not null references public.data_versions(id) on delete restrict,
  severity text not null check (severity in ('info', 'warning', 'error')),
  code text not null,
  field_name text,
  source_row_number bigint check (source_row_number is null or source_row_number > 0),
  masked_sample text,
  issue_count bigint not null default 1 check (issue_count > 0),
  created_at timestamptz not null default now()
);

create index validation_issues_version_severity_idx
  on public.validation_issues(data_version_id, severity, code);

create table public.monthly_item_summary (
  id bigint generated always as identity primary key,
  data_version_id bigint not null references public.data_versions(id) on delete restrict,
  billing_month date not null,
  item_number text not null,
  category text,
  quantity numeric(24,6) not null default 0,
  exact_amount numeric(24,4),
  total_cost numeric(24,4),
  row_count bigint not null check (row_count >= 0),
  unique (data_version_id, billing_month, item_number)
);

create index monthly_item_summary_filter_idx
  on public.monthly_item_summary(data_version_id, billing_month, category, item_number);

create table public.monthly_customer_summary (
  id bigint generated always as identity primary key,
  data_version_id bigint not null references public.data_versions(id) on delete restrict,
  billing_month date not null,
  customer_no text not null,
  customer_name text not null,
  customer_id bigint references public.customers(id) on delete restrict,
  shipment_quantity numeric(24,6),
  shipment_amount numeric(24,4),
  shipment_cost numeric(24,4),
  total_dv numeric(24,4),
  total_revenue numeric(24,4),
  row_count bigint not null check (row_count >= 0),
  unique (data_version_id, billing_month, customer_no, customer_name)
);

create index monthly_customer_summary_filter_idx
  on public.monthly_customer_summary(data_version_id, billing_month, customer_no, customer_name);
create index monthly_customer_summary_customer_id_idx
  on public.monthly_customer_summary(customer_id)
  where customer_id is not null;

create table public.monthly_customer_item_summary (
  id bigint generated always as identity primary key,
  data_version_id bigint not null references public.data_versions(id) on delete restrict,
  billing_month date not null,
  customer_no text not null,
  customer_name text not null,
  customer_id bigint references public.customers(id) on delete restrict,
  item_number text not null,
  shipment_quantity numeric(24,6),
  shipment_amount numeric(24,4),
  shipment_cost numeric(24,4),
  total_dv numeric(24,4),
  row_count bigint not null check (row_count >= 0),
  unique (data_version_id, billing_month, customer_no, customer_name, item_number)
);

create index monthly_customer_item_summary_filter_idx
  on public.monthly_customer_item_summary(
    data_version_id, billing_month, customer_no, customer_name, item_number
  );
create index monthly_customer_item_summary_customer_id_idx
  on public.monthly_customer_item_summary(customer_id)
  where customer_id is not null;

create table public.audit_events (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  actor_user_id uuid references auth.users(id) on delete restrict,
  event_type text not null,
  entity_type text not null,
  entity_public_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_entity_idx
  on public.audit_events(entity_type, entity_public_id, created_at desc);
create index audit_events_actor_idx
  on public.audit_events(actor_user_id, created_at desc)
  where actor_user_id is not null;

create or replace function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.app_members member
      where member.user_id = (select auth.uid())
        and member.is_active
    );
$$;

revoke all on function private.is_active_member() from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_active_member() to authenticated, service_role;

alter table public.app_members enable row level security;
alter table public.upload_jobs enable row level security;
alter table public.data_versions enable row level security;
alter table public.shipment_records enable row level security;
alter table public.dv_records enable row level security;
alter table public.customers enable row level security;
alter table public.customer_mappings enable row level security;
alter table public.validation_issues enable row level security;
alter table public.monthly_item_summary enable row level security;
alter table public.monthly_customer_summary enable row level security;
alter table public.monthly_customer_item_summary enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.app_members to authenticated;
grant select, insert on public.upload_jobs to authenticated;
grant select on public.data_versions to authenticated;
grant select on public.shipment_records to authenticated;
grant select on public.dv_records to authenticated;
grant select on public.customers to authenticated;
grant select on public.customer_mappings to authenticated;
grant select on public.validation_issues to authenticated;
grant select on public.monthly_item_summary to authenticated;
grant select on public.monthly_customer_summary to authenticated;
grant select on public.monthly_customer_item_summary to authenticated;
grant select on public.audit_events to authenticated;

create policy app_members_select_self
on public.app_members for select to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

create policy upload_jobs_select_member
on public.upload_jobs for select to authenticated
using ((select private.is_active_member()));

create policy upload_jobs_insert_self
on public.upload_jobs for insert to authenticated
with check (
  (select private.is_active_member())
  and created_by = (select auth.uid())
);

create policy data_versions_select_member
on public.data_versions for select to authenticated
using ((select private.is_active_member()));

create policy shipment_records_select_member
on public.shipment_records for select to authenticated
using ((select private.is_active_member()));

create policy dv_records_select_member
on public.dv_records for select to authenticated
using ((select private.is_active_member()));

create policy customers_select_member
on public.customers for select to authenticated
using ((select private.is_active_member()));

create policy customer_mappings_select_member
on public.customer_mappings for select to authenticated
using ((select private.is_active_member()));

create policy validation_issues_select_member
on public.validation_issues for select to authenticated
using ((select private.is_active_member()));

create policy monthly_item_summary_select_member
on public.monthly_item_summary for select to authenticated
using ((select private.is_active_member()));

create policy monthly_customer_summary_select_member
on public.monthly_customer_summary for select to authenticated
using ((select private.is_active_member()));

create policy monthly_customer_item_summary_select_member
on public.monthly_customer_item_summary for select to authenticated
using ((select private.is_active_member()));

create policy audit_events_select_member
on public.audit_events for select to authenticated
using ((select private.is_active_member()));

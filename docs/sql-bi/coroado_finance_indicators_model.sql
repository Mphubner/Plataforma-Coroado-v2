-- Coroado SQL/BI model v1
-- Target: PostgreSQL on Cloud SQL or Firebase Data Connect/SQL Connect compatible PostgreSQL.
-- Purpose: keep Firestore as the operational source and project recurring facts into analytical tables.

create schema if not exists coroado_bi;

create table if not exists coroado_bi.dim_tenant (
  tenant_id text primary key,
  name text,
  city text,
  state text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists coroado_bi.dim_member (
  member_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  name text,
  email text,
  primary_role text,
  cell_id text,
  ministry_id text,
  is_approved boolean default false,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists coroado_bi.dim_course (
  course_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  title text not null,
  category text,
  status text,
  is_subscription_only boolean default false,
  monthly_price numeric(12,2),
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists coroado_bi.dim_event (
  event_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  title text not null,
  category text,
  starts_at timestamptz,
  capacity integer,
  is_paid boolean default false,
  price numeric(12,2),
  status text,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists coroado_bi.fact_payment_event (
  payment_event_id text primary key,
  provider text not null,
  provider_payment_id text not null,
  reference_id text not null,
  target_type text not null,
  tenant_id text references coroado_bi.dim_tenant(tenant_id),
  status text not null,
  amount numeric(12,2) default 0,
  received_at timestamptz default now(),
  raw_payload jsonb
);

create table if not exists coroado_bi.fact_transaction (
  transaction_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  member_id text,
  source text not null,
  type text not null,
  item_id text,
  status text not null,
  method text,
  amount numeric(12,2) not null,
  transaction_date date not null,
  payment_id text,
  reconciled_at timestamptz,
  reconciled_by text,
  reconciliation_note text,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists coroado_bi.fact_order (
  order_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  member_id text,
  status text not null,
  payment_status text,
  payment_method text,
  total numeric(12,2) not null,
  item_count integer default 0,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists coroado_bi.fact_event_enrollment (
  enrollment_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  event_id text not null,
  member_id text not null,
  payment_status text,
  checked_in boolean default false,
  checked_in_at timestamptz,
  kids_count integer default 0,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists coroado_bi.fact_cell_report (
  report_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  cell_id text not null,
  report_date date not null,
  meeting_type text,
  present_count integer default 0,
  visitor_count integer default 0,
  created_by text,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists coroado_bi.fact_school_progress (
  enrollment_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  course_id text not null,
  member_id text not null,
  completed_lessons integer default 0,
  total_lessons integer default 0,
  progress_percent numeric(5,2) default 0,
  status text not null,
  updated_at timestamptz
);

create table if not exists coroado_bi.fact_subscription (
  subscription_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  member_id text not null,
  provider text,
  provider_subscription_id text,
  status text not null,
  amount numeric(12,2) default 0,
  source text,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists coroado_bi.fact_learning_access (
  access_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  member_id text not null,
  target_type text not null,
  target_id text not null,
  course_id text,
  order_id text,
  status text not null,
  source text,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists coroado_bi.fact_kpi_entry (
  kpi_entry_id text primary key,
  tenant_id text not null references coroado_bi.dim_tenant(tenant_id),
  metric_key text not null,
  metric_date date not null,
  value numeric(14,4) not null,
  source text,
  created_at timestamptz default now()
);

create index if not exists idx_fact_transaction_tenant_date on coroado_bi.fact_transaction (tenant_id, transaction_date);
create index if not exists idx_fact_transaction_status on coroado_bi.fact_transaction (status, type);
create index if not exists idx_fact_cell_report_tenant_date on coroado_bi.fact_cell_report (tenant_id, report_date);
create index if not exists idx_fact_event_enrollment_event on coroado_bi.fact_event_enrollment (event_id, checked_in);
create index if not exists idx_fact_school_progress_tenant_course on coroado_bi.fact_school_progress (tenant_id, course_id, status);
create index if not exists idx_fact_subscription_tenant_status on coroado_bi.fact_subscription (tenant_id, status);
create index if not exists idx_fact_learning_access_member on coroado_bi.fact_learning_access (member_id, target_type, target_id);

create or replace view coroado_bi.mart_finance_monthly as
select
  tenant_id,
  date_trunc('month', transaction_date)::date as month,
  type,
  method,
  sum(case when status = 'completed' then amount else 0 end) as completed_revenue,
  sum(case when status = 'pending' then amount else 0 end) as pending_revenue,
  count(*) as transaction_count
from coroado_bi.fact_transaction
group by tenant_id, date_trunc('month', transaction_date)::date, type, method;

create or replace view coroado_bi.mart_event_conversion as
select
  e.tenant_id,
  e.event_id,
  ev.title,
  count(*) as enrollments,
  count(*) filter (where e.payment_status = 'approved') as paid_or_approved,
  count(*) filter (where e.checked_in) as checkins,
  case when count(*) = 0 then 0 else round((count(*) filter (where e.checked_in))::numeric / count(*) * 100, 2) end as checkin_rate
from coroado_bi.fact_event_enrollment e
left join coroado_bi.dim_event ev on ev.event_id = e.event_id
group by e.tenant_id, e.event_id, ev.title;

create or replace view coroado_bi.mart_cell_health as
select
  tenant_id,
  cell_id,
  date_trunc('month', report_date)::date as month,
  avg(present_count) as avg_presence,
  sum(visitor_count) as visitors,
  count(*) as reports_submitted
from coroado_bi.fact_cell_report
group by tenant_id, cell_id, date_trunc('month', report_date)::date;

create or replace view coroado_bi.mart_school_completion as
select
  tenant_id,
  course_id,
  count(*) as enrollments,
  count(*) filter (where status = 'completed') as completed,
  avg(progress_percent) as avg_progress
from coroado_bi.fact_school_progress
group by tenant_id, course_id;

create or replace view coroado_bi.mart_school_revenue_access as
select
  tenant_id,
  count(*) filter (where status in ('active', 'authorized')) as active_subscriptions,
  sum(case when status in ('active', 'authorized') then amount else 0 end) as active_subscription_mrr,
  (select count(*) from coroado_bi.fact_learning_access la where la.tenant_id = s.tenant_id and la.status = 'active') as active_one_time_accesses
from coroado_bi.fact_subscription s
group by tenant_id;

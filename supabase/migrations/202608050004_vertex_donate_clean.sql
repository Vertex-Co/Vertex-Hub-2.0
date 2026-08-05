-- Vertex Donate: armazenamento novo e isolado. A tabela antiga permanece somente como histórico.
create table if not exists public.vertex_support_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  company_id uuid references public.companies(id) on delete set null,
  client_request_id uuid not null,
  mercado_pago_order_id text unique,
  external_reference text not null unique,
  idempotency_key uuid not null unique,
  amount numeric(12,2) not null check (amount between 5 and 1000),
  currency text not null default 'BRL' check (currency = 'BRL'),
  payment_method text,
  payment_method_type text,
  status text not null default 'created',
  status_detail text,
  message text check (char_length(message) <= 200),
  is_public boolean not null default false,
  environment text not null check (environment in ('test', 'production')),
  live_mode boolean not null default false,
  mercado_pago_application_id text,
  safe_provider_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  refunded_at timestamptz,
  unique (user_id, client_request_id)
);

create index if not exists vertex_support_user_created_idx on public.vertex_support_payments(user_id, created_at desc);
create index if not exists vertex_support_company_created_idx on public.vertex_support_payments(company_id, created_at desc);
create index if not exists vertex_support_status_idx on public.vertex_support_payments(status, environment, created_at desc);

alter table public.vertex_support_payments enable row level security;
revoke all on public.vertex_support_payments from anon, authenticated;
grant select on public.vertex_support_payments to authenticated;

drop policy if exists vertex_support_own_read on public.vertex_support_payments;
create policy vertex_support_own_read on public.vertex_support_payments
for select to authenticated using (user_id = auth.uid());

-- Escritas financeiras são exclusivas das Edge Functions com service role.
comment on table public.vertex_support_payments is 'Vertex Donate. Dados antigos permanecem em support_payments e não participam desta integração.';
comment on column public.vertex_support_payments.safe_provider_data is 'Somente IDs, status e dados Pix retornados; nunca tokens ou dados PCI.';

create or replace view public.vertex_support_summary with (security_invoker=true) as
select
  user_id,
  count(*) filter (where environment = 'production' and live_mode and status = 'approved' and refunded_at is null) as approved_count,
  coalesce(sum(amount) filter (where environment = 'production' and live_mode and status = 'approved' and refunded_at is null), 0) as approved_total
from public.vertex_support_payments
group by user_id;

revoke all on public.vertex_support_summary from anon;
grant select on public.vertex_support_summary to authenticated;

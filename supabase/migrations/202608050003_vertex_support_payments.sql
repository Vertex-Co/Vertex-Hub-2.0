-- Apoio voluntario Vertex: somente teste nesta versao.
create table if not exists public.support_payments(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 company_id uuid references public.companies(id) on delete set null,
 client_request_id uuid not null,
 mercado_pago_order_id text unique,
 external_reference text not null unique,
 idempotency_key uuid not null unique,
 amount numeric(12,2) not null check(amount between 5 and 1000),
 currency text not null default 'BRL' check(currency='BRL'),
 payment_method text,
 order_status text not null default 'created',
 transaction_status text,
 status_detail text,
 message text check(char_length(message)<=200),
 is_public boolean not null default false,
 environment text not null check(environment in('test','production')),
 live_mode boolean not null default false,
 raw_safe_response jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 paid_at timestamptz,refunded_at timestamptz,
 unique(user_id,client_request_id)
);
create index if not exists support_payments_user_created_idx on public.support_payments(user_id,created_at desc);
create index if not exists support_payments_company_created_idx on public.support_payments(company_id,created_at desc);
create index if not exists support_payments_status_idx on public.support_payments(order_status,environment,created_at desc);
alter table public.support_payments enable row level security;
revoke all on public.support_payments from anon,authenticated;
grant select on public.support_payments to authenticated;
create policy support_own_read on public.support_payments for select to authenticated using(user_id=auth.uid());
create policy support_company_admin_read on public.support_payments for select to authenticated using(company_id is not null and public.is_company_owner(company_id));
-- Service Role ignora RLS. Nao existe INSERT/UPDATE/DELETE para clientes.

create or replace view public.public_supporters with(security_invoker=true) as
 select distinct p.user_id,p.full_name from public.support_payments s join public.profiles p on p.user_id=s.user_id
 where s.is_public and s.environment='production' and not s.live_mode=false and s.order_status='approved' and s.refunded_at is null;
revoke all on public.public_supporters from anon;
grant select on public.public_supporters to authenticated;

comment on table public.support_payments is 'Apoios voluntarios. Pagamentos test nunca concedem recompensas reais.';
comment on column public.support_payments.raw_safe_response is 'Somente IDs/status; nunca dados PCI, token de cartao ou PII.';


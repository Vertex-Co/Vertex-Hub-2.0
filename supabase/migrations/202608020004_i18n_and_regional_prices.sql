-- Internacionalização pública e preços comerciais por mercado (sem conversão cambial).
create table if not exists public.plan_prices(id uuid primary key default gen_random_uuid(),plan text not null references public.plan_settings(plan) on delete cascade,market text not null check(market in('BR','INTL')),currency text not null check(currency in('BRL','USD')),monthly_price numeric(14,2),three_month_price numeric(14,2),annual_price numeric(14,2),lifetime_price numeric(14,2),active boolean not null default true,updated_by uuid references auth.users(id),updated_at timestamptz not null default now(),unique(plan,market));
insert into public.plan_prices(plan,market,currency,monthly_price) values('free','BR','BRL',0),('start','BR','BRL',50),('growth','BR','BRL',100),('prime','BR','BRL',150),('enterprise','BR','BRL',null),('free','INTL','USD',0),('start','INTL','USD',null),('growth','INTL','USD',null),('prime','INTL','USD',50),('enterprise','INTL','USD',null) on conflict(plan,market) do nothing;
alter table public.plan_prices enable row level security;
drop policy if exists plan_prices_public_read on public.plan_prices;create policy plan_prices_public_read on public.plan_prices for select to anon,authenticated using(active or is_super_admin());
drop policy if exists plan_prices_admin on public.plan_prices;create policy plan_prices_admin on public.plan_prices for all to authenticated using(is_super_admin()) with check(is_super_admin());
grant select on public.plan_prices to anon,authenticated;grant insert,update,delete on public.plan_prices to authenticated;
drop policy if exists plans_public_read on public.plan_settings;create policy plans_public_read on public.plan_settings for select to anon using(true);grant select on public.plan_settings to anon;
alter table public.profiles add column if not exists locale text not null default 'pt-BR' check(locale in('pt-BR','en','es'));
alter table public.profiles add column if not exists market text not null default 'BR' check(market in('BR','INTL'));
alter table public.site_content add column if not exists locale text not null default 'pt-BR' check(locale in('pt-BR','en','es'));
create index if not exists site_content_locale_idx on public.site_content(locale,key);

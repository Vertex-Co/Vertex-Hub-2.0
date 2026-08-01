-- Vertex Hub 2.0: modelo multiempresa, onboarding atômico e autorização RLS.
create extension if not exists pgcrypto;
do $$ begin create type public.global_role as enum ('user','admin','super_admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.company_role as enum ('company_owner','member'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles(
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 full_name text not null, email text not null, phone text check(phone is null or phone ~ '^\d{10,11}$'), cpf text unique check(cpf is null or cpf ~ '^\d{11}$'),
 avatar_url text, global_role public.global_role not null default 'user', onboarding_completed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.companies(
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 2 and 160), legal_name text,
 cnpj text not null unique check(cnpj ~ '^\d{14}$'), phone text check(phone is null or phone ~ '^\d{10,11}$'), email text, logo_url text,
 status text not null default 'active' check(status in('active','inactive')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.company_members(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, role public.company_role not null default 'member', created_at timestamptz not null default now(), unique(company_id,user_id));
create table if not exists public.company_settings(
 company_id uuid primary key references public.companies(id) on delete cascade, monthly_budget numeric(14,2) not null default 0 check(monthly_budget>=0), currency text not null default 'BRL', updated_at timestamptz not null default now());
create table if not exists public.activity_logs(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null, action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}', created_at timestamptz not null default now());

alter table public.transactions add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.transactions add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.goals add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.goals add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.category_budgets add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.category_budgets add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.category_budgets drop constraint if exists category_budgets_user_id_category_month_year_key;
create unique index if not exists category_budgets_company_period_uidx on public.category_budgets(company_id,category,month,year) where company_id is not null;
create index if not exists company_members_user_idx on public.company_members(user_id);
create index if not exists transactions_company_date_idx on public.transactions(company_id,date desc);
create index if not exists goals_company_idx on public.goals(company_id);
create index if not exists activity_logs_company_created_idx on public.activity_logs(company_id,created_at desc);

create or replace function public.is_vertex_admin(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where user_id=uid and global_role in('admin','super_admin'))$$;
create or replace function public.is_company_member(cid uuid,uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from company_members where company_id=cid and user_id=uid)$$;
revoke all on function public.is_vertex_admin(uuid) from public; grant execute on function public.is_vertex_admin(uuid) to authenticated;
revoke all on function public.is_company_member(uuid,uuid) from public; grant execute on function public.is_company_member(uuid,uuid) to authenticated;

create or replace function public.complete_company_onboarding(p_full_name text,p_phone text,p_cpf text,p_company_name text,p_legal_name text,p_cnpj text,p_company_phone text,p_company_email text)
returns uuid language plpgsql security definer set search_path=public as $$declare cid uuid; mail text;begin
 if auth.uid() is null then raise exception 'Sessão inválida'; end if;
 if p_cpf !~ '^\d{11}$' or p_cnpj !~ '^\d{14}$' or p_phone !~ '^\d{10,11}$' then raise exception 'Dados normalizados inválidos'; end if;
 select email into mail from auth.users where id=auth.uid();
 insert into profiles(user_id,full_name,email,phone,cpf,onboarding_completed) values(auth.uid(),trim(p_full_name),mail,p_phone,p_cpf,false)
 on conflict(user_id) do update set full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,cpf=excluded.cpf,updated_at=now();
 insert into companies(name,legal_name,cnpj,phone,email) values(trim(p_company_name),nullif(trim(p_legal_name),''),p_cnpj,nullif(p_company_phone,''),nullif(lower(trim(p_company_email)),'')) returning id into cid;
 insert into company_members(company_id,user_id,role) values(cid,auth.uid(),'company_owner');
 insert into company_settings(company_id) values(cid);
 update profiles set onboarding_completed=true,updated_at=now() where user_id=auth.uid();
 insert into activity_logs(company_id,actor_id,action,entity_type,entity_id) values(cid,auth.uid(),'company.created','company',cid); return cid;
end$$;
revoke all on function public.complete_company_onboarding(text,text,text,text,text,text,text,text) from public;
grant execute on function public.complete_company_onboarding(text,text,text,text,text,text,text,text) to authenticated;

alter table public.profiles enable row level security; alter table public.companies enable row level security; alter table public.company_members enable row level security; alter table public.company_settings enable row level security; alter table public.activity_logs enable row level security;
grant select,update on public.profiles to authenticated; grant select,update on public.companies to authenticated; grant select on public.company_members to authenticated; grant select,update on public.company_settings to authenticated; grant select on public.activity_logs to authenticated;
drop policy if exists profiles_select on public.profiles; create policy profiles_select on public.profiles for select to authenticated using(user_id=auth.uid() or is_vertex_admin());
-- Alterações de papel/perfil não são liberadas diretamente ao cliente. O onboarding
-- usa a RPC security-definer e promoções administrativas são deliberadamente manuais.
drop policy if exists profiles_update on public.profiles; create policy profiles_update on public.profiles for update to authenticated using(is_vertex_admin()) with check(is_vertex_admin());
drop policy if exists companies_select on public.companies; create policy companies_select on public.companies for select to authenticated using(is_vertex_admin() or is_company_member(id));
drop policy if exists companies_update on public.companies; create policy companies_update on public.companies for update to authenticated using(is_vertex_admin() or exists(select 1 from company_members m where m.company_id=id and m.user_id=auth.uid() and m.role='company_owner'));
drop policy if exists members_select on public.company_members; create policy members_select on public.company_members for select to authenticated using(is_vertex_admin() or is_company_member(company_id));
drop policy if exists company_settings_all on public.company_settings; create policy company_settings_all on public.company_settings for all to authenticated using(is_vertex_admin() or is_company_member(company_id)) with check(is_vertex_admin() or is_company_member(company_id));
drop policy if exists logs_select on public.activity_logs; create policy logs_select on public.activity_logs for select to authenticated using(is_vertex_admin() or is_company_member(company_id));

drop policy if exists "Users manage own transactions" on public.transactions;
drop policy if exists transactions_tenant on public.transactions; create policy transactions_tenant on public.transactions for all to authenticated using(company_id is not null and (is_vertex_admin() or is_company_member(company_id))) with check(company_id is not null and created_by=auth.uid() and (is_vertex_admin() or is_company_member(company_id)));
drop policy if exists "Users manage own goals" on public.goals;
drop policy if exists goals_tenant on public.goals; create policy goals_tenant on public.goals for all to authenticated using(company_id is not null and (is_vertex_admin() or is_company_member(company_id))) with check(company_id is not null and created_by=auth.uid() and (is_vertex_admin() or is_company_member(company_id)));
drop policy if exists "Users select own category budgets" on public.category_budgets; drop policy if exists "Users insert own category budgets" on public.category_budgets; drop policy if exists "Users update own category budgets" on public.category_budgets; drop policy if exists "Users delete own category budgets" on public.category_budgets;
drop policy if exists category_budgets_tenant on public.category_budgets; create policy category_budgets_tenant on public.category_budgets for all to authenticated using(company_id is not null and (is_vertex_admin() or is_company_member(company_id))) with check(company_id is not null and created_by=auth.uid() and (is_vertex_admin() or is_company_member(company_id)));

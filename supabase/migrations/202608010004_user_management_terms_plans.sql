-- Gestão de usuários, termos e configuração central de planos.
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- Contas Auth antigas sem profile passam a aparecer no backoffice sem sobrescrever dados válidos.
insert into public.profiles(user_id,full_name,email,avatar_url,global_role,onboarding_completed,created_at,updated_at)
select u.id,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),split_part(coalesce(u.email,'usuario'),'@',1)),coalesce(u.email,u.id::text||'@sem-email.local'),coalesce(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture'),'user',false,u.created_at,now()
from auth.users u left join public.profiles p on p.user_id=u.id where p.user_id is null;

create table if not exists public.terms_acceptances(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 terms_type text not null check(terms_type in('usage','commercial')),terms_version text not null,
 company_id uuid references public.companies(id) on delete set null,accepted_at timestamptz not null default now(),
 unique(user_id,terms_type,terms_version,company_id));
create table if not exists public.commercial_interests(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),company_id uuid not null references public.companies(id),
 plan text not null check(plan in('start','growth','prime','enterprise')),duration text not null check(duration in('1_month','3_months','12_months','lifetime')),
 displayed_price numeric(14,2),discount_percent numeric(5,2) not null default 0,terms_version text not null,status text not null default 'commercial_interest' check(status='commercial_interest'),accepted_at timestamptz not null default now());
create table if not exists public.plan_settings(
 plan text primary key check(plan in('free','start','growth','prime','enterprise')),display_name text not null,monthly_price numeric(14,2),user_limit integer,
 lifetime_base_price numeric(14,2),discount_3_months numeric(5,2) not null default 5,discount_12_months numeric(5,2) not null default 5,discount_lifetime numeric(5,2) not null default 10,
 description text not null,updated_by uuid references auth.users(id),updated_at timestamptz not null default now());
insert into public.plan_settings(plan,display_name,monthly_price,user_limit,description) values
 ('free','Free',0,3,'Para utilizar o Vertex Hub gratuitamente.'),('start','Start',50,3,'Estrutura simples para pequenos negócios.'),
 ('growth','Growth',100,10,'Para empresas em crescimento.'),('prime','Prime',150,30,'Para operações com equipes maiores.'),
 ('enterprise','Enterprise',null,null,'Condições personalizadas para sua empresa.')
on conflict(plan) do update set display_name=excluded.display_name,monthly_price=excluded.monthly_price,user_limit=excluded.user_limit where plan_settings.updated_by is null;

create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into profiles(user_id,full_name,email,avatar_url,onboarding_completed) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),nullif(new.raw_user_meta_data->>'name',''),split_part(coalesce(new.email,'Usuário'),'@',1)),coalesce(new.email,new.id::text||'@sem-email.local'),coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture'),false) on conflict(user_id) do nothing;
 if new.raw_user_meta_data->>'terms_version' is not null and new.raw_user_meta_data->>'terms_accepted_at' is not null then insert into terms_acceptances(user_id,terms_type,terms_version,accepted_at) values(new.id,'usage',new.raw_user_meta_data->>'terms_version',coalesce((new.raw_user_meta_data->>'terms_accepted_at')::timestamptz,now())) on conflict do nothing;end if;return new;end$$;
drop trigger if exists on_auth_user_created_vertex on auth.users;create trigger on_auth_user_created_vertex after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.accept_terms(p_type text,p_version text,p_company_id uuid default null) returns void language plpgsql security definer set search_path=public as $$begin if auth.uid() is null then raise exception 'Sessão inválida';end if;if p_type not in('usage','commercial') then raise exception 'Tipo inválido';end if;insert into terms_acceptances(user_id,terms_type,terms_version,company_id) values(auth.uid(),p_type,p_version,p_company_id) on conflict do nothing;end$$;
create or replace function public.register_commercial_interest(p_company_id uuid,p_plan text,p_duration text,p_price numeric,p_discount numeric,p_terms_version text) returns uuid language plpgsql security definer set search_path=public as $$declare result uuid;begin if not is_company_member(p_company_id) then raise exception 'Acesso negado';end if;insert into commercial_interests(user_id,company_id,plan,duration,displayed_price,discount_percent,terms_version) values(auth.uid(),p_company_id,p_plan,p_duration,p_price,p_discount,p_terms_version) returning id into result;insert into terms_acceptances(user_id,terms_type,terms_version,company_id) values(auth.uid(),'commercial',p_terms_version,p_company_id) on conflict do nothing;return result;end$$;
grant execute on function public.accept_terms(text,text,uuid),public.register_commercial_interest(uuid,text,text,numeric,numeric,text) to authenticated;
create or replace function public.complete_password_change() returns void language sql security definer set search_path=public as $$update profiles set must_change_password=false,updated_at=now() where user_id=auth.uid()$$;
grant execute on function public.complete_password_change() to authenticated;

-- Reforça alteração de cargo: owner somente por Super Admin e nunca remove o último owner.
create or replace function public.admin_set_member_role(p_member_id uuid,p_role text) returns void language plpgsql security definer set search_path=public as $$declare m company_members%rowtype;old_role text;owners integer;begin select * into m from company_members where id=p_member_id;if m.id is null then raise exception 'Membro não encontrado';end if;if not(is_super_admin() or is_company_admin(m.company_id)) then raise exception 'Acesso negado';end if;if p_role not in('company_owner','admin','employee') then raise exception 'Role inválida';end if;if p_role='company_owner' and not is_super_admin() then raise exception 'Somente Super Admin pode definir owner';end if;if m.role='company_owner' and p_role<>'company_owner' then select count(*) into owners from company_members where company_id=m.company_id and role='company_owner';if owners<=1 then raise exception 'A empresa precisa manter pelo menos um owner';end if;if not is_super_admin() then raise exception 'Somente Super Admin pode alterar owner';end if;end if;old_role:=m.role;update company_members set role=p_role where id=p_member_id;insert into activity_logs(company_id,actor_id,action,entity_type,entity_id,old_value,new_value) values(m.company_id,auth.uid(),'member.role_changed','company_member',m.id,jsonb_build_object('role',old_role),jsonb_build_object('role',p_role));end$$;

alter table public.terms_acceptances enable row level security;alter table public.commercial_interests enable row level security;alter table public.plan_settings enable row level security;
grant select on public.terms_acceptances,public.commercial_interests,public.plan_settings to authenticated;grant insert on public.terms_acceptances,public.commercial_interests to authenticated;grant update on public.plan_settings to authenticated;
create policy terms_read on public.terms_acceptances for select to authenticated using(user_id=auth.uid() or is_super_admin());
create policy interests_read on public.commercial_interests for select to authenticated using(user_id=auth.uid() or is_super_admin() or is_company_admin(company_id));
create policy plans_read on public.plan_settings for select to authenticated using(true);create policy plans_admin on public.plan_settings for update to authenticated using(is_super_admin()) with check(is_super_admin());
create index if not exists terms_user_type_idx on public.terms_acceptances(user_id,terms_type,terms_version);create index if not exists interests_company_created_idx on public.commercial_interests(company_id,accepted_at desc);

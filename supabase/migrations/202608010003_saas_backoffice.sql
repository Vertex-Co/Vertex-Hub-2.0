-- Vertex Hub SaaS Backoffice: planos, RBAC empresarial, CMS, flags, suporte e auditoria.
alter table public.company_members alter column role type text using role::text;
alter table public.company_members drop constraint if exists company_members_role_check;
alter table public.company_members add constraint company_members_role_check check(role in('company_owner','admin','manager','financial','employee','viewer','member'));

alter table public.companies add column if not exists plan text not null default 'free';
alter table public.companies add column if not exists enterprise_user_limit integer;
alter table public.companies add column if not exists enterprise_storage_gb integer;
alter table public.companies add column if not exists enterprise_financial_assistance boolean not null default false;
alter table public.companies add column if not exists enterprise_notes text;
alter table public.companies drop constraint if exists companies_status_check;
alter table public.companies add constraint companies_status_check check(status in('active','suspended','inactive'));
alter table public.companies add constraint companies_plan_check check(plan in('free','start','growth','prime','enterprise'));
alter table public.companies add constraint companies_enterprise_limits_check check((enterprise_user_limit is null or enterprise_user_limit>0) and (enterprise_storage_gb is null or enterprise_storage_gb>=0));
update public.companies set plan='free' where plan is null;

alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists auth_method text;
alter table public.profiles add constraint profiles_status_check check(status in('active','suspended'));

alter table public.activity_logs alter column company_id drop not null;
alter table public.activity_logs add column if not exists old_value jsonb;
alter table public.activity_logs add column if not exists new_value jsonb;

create table if not exists public.feature_flags(
 id uuid primary key default gen_random_uuid(), key text not null unique check(key~'^[a-z0-9_]+$'), name text not null,
 description text, enabled boolean not null default false, target_type text not null default 'all' check(target_type in('all','plans','companies')),
 target_values text[] not null default '{}', updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.site_content(
 key text primary key check(key~'^[a-z0-9_.]+$'), label text not null, value text not null default '', content_type text not null default 'text' check(content_type in('text','url','email','phone')),
 updated_by uuid references auth.users(id), updated_at timestamptz not null default now());
create table if not exists public.platform_notifications(
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 2 and 120), message text not null check(char_length(message) between 2 and 2000),
 type text not null check(type in('information','news','maintenance','important')), target_type text not null check(target_type in('all','plan','company')),
 target_value text, active boolean not null default true, created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table if not exists public.support_tickets(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, created_by uuid not null references auth.users(id),
 title text not null check(char_length(title) between 3 and 160), description text not null check(char_length(description) between 5 and 5000), category text not null default 'general',
 status text not null default 'open' check(status in('open','in_review','waiting_customer','resolved','closed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.global_settings(key text primary key,value text not null,updated_by uuid references auth.users(id),updated_at timestamptz not null default now());
insert into public.global_settings(key,value) values('platform_name','Vertex Hub'),('commercial_whatsapp','5561993972886'),('commercial_email','') on conflict(key) do nothing;
insert into public.site_content(key,label,value,content_type) values
 ('home.title','Título principal','Sua gestão financeira em um só lugar.','text'),
 ('home.subtitle','Subtítulo','Organize receitas, despesas, metas e orçamentos com clareza e segurança.','text'),
 ('plans.introduction','Introdução dos planos','O Vertex Hub pode ser utilizado gratuitamente. Os planos pagos são opcionais.','text'),
 ('footer.notice','Texto do rodapé','© 2026 Vertex. Todos os direitos reservados.','text') on conflict(key) do nothing;
insert into public.feature_flags(key,name,description,enabled) values('passkeys','Passkeys','Login por chaves de acesso',true),('financial_module','Módulo financeiro','Recursos financeiros principais',true),('new_dashboard','Novo Dashboard','Nova experiência do painel',true),('new_crm','Novo CRM','Módulo futuro de CRM',false) on conflict(key) do nothing;

create or replace function public.is_super_admin(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where user_id=uid and global_role='super_admin' and status='active')$$;
create or replace function public.is_company_admin(cid uuid,uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from company_members m join profiles p on p.user_id=m.user_id where m.company_id=cid and m.user_id=uid and m.role in('company_owner','admin') and p.status='active')$$;
create or replace function public.company_is_active(cid uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from companies where id=cid and status='active')$$;
grant execute on function public.is_super_admin(uuid),public.is_company_admin(uuid,uuid),public.company_is_active(uuid) to authenticated;
create or replace function public.is_vertex_admin(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$select public.is_super_admin(uid)$$;

create or replace function public.plan_user_limit(p_plan text,p_enterprise integer default null) returns integer language sql immutable as $$select case p_plan when 'free' then 3 when 'start' then 3 when 'growth' then 10 when 'prime' then 30 when 'enterprise' then coalesce(p_enterprise,30) else 3 end$$;
create or replace function public.enforce_company_member_limit() returns trigger language plpgsql security definer set search_path=public as $$declare used integer;allowed integer;begin select count(*),plan_user_limit(c.plan,c.enterprise_user_limit) into used,allowed from companies c left join company_members m on m.company_id=c.id where c.id=new.company_id group by c.plan,c.enterprise_user_limit;if used>=allowed then raise exception using errcode='P0001',message='company_user_limit_reached';end if;return new;end$$;
drop trigger if exists enforce_company_member_limit_trigger on public.company_members;create trigger enforce_company_member_limit_trigger before insert on public.company_members for each row execute function public.enforce_company_member_limit();

create or replace function public.admin_set_company_plan(p_company_id uuid,p_plan text,p_user_limit integer default null,p_storage_gb integer default null,p_assistance boolean default false,p_notes text default null) returns void language plpgsql security definer set search_path=public as $$declare oldrow companies%rowtype;begin if not is_super_admin() then raise exception 'Acesso negado';end if;if p_plan not in('free','start','growth','prime','enterprise') then raise exception 'Plano inválido';end if;select * into oldrow from companies where id=p_company_id;update companies set plan=p_plan,enterprise_user_limit=case when p_plan='enterprise' then p_user_limit end,enterprise_storage_gb=case when p_plan='enterprise' then p_storage_gb end,enterprise_financial_assistance=case when p_plan='enterprise' then p_assistance else false end,enterprise_notes=case when p_plan='enterprise' then nullif(trim(p_notes),'') end,updated_at=now() where id=p_company_id;insert into activity_logs(company_id,actor_id,action,entity_type,entity_id,old_value,new_value) values(p_company_id,auth.uid(),'company.plan_changed','company',p_company_id,jsonb_build_object('plan',oldrow.plan),jsonb_build_object('plan',p_plan));end$$;
create or replace function public.admin_set_company_status(p_company_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$declare old_status text;begin if not is_super_admin() then raise exception 'Acesso negado';end if;if p_status not in('active','suspended') then raise exception 'Status inválido';end if;select status into old_status from companies where id=p_company_id;update companies set status=p_status,updated_at=now() where id=p_company_id;insert into activity_logs(company_id,actor_id,action,entity_type,entity_id,old_value,new_value) values(p_company_id,auth.uid(),'company.status_changed','company',p_company_id,jsonb_build_object('status',old_status),jsonb_build_object('status',p_status));end$$;
create or replace function public.admin_set_member_role(p_member_id uuid,p_role text) returns void language plpgsql security definer set search_path=public as $$declare m company_members%rowtype;old_role text;begin select * into m from company_members where id=p_member_id;if not(is_super_admin() or is_company_admin(m.company_id)) then raise exception 'Acesso negado';end if;if p_role not in('admin','manager','financial','employee','viewer') then raise exception 'Role inválida';end if;old_role:=m.role;update company_members set role=p_role where id=p_member_id;insert into activity_logs(company_id,actor_id,action,entity_type,entity_id,old_value,new_value) values(m.company_id,auth.uid(),'member.role_changed','company_member',m.id,jsonb_build_object('role',old_role),jsonb_build_object('role',p_role));end$$;
grant execute on function public.admin_set_company_plan(uuid,text,integer,integer,boolean,text),public.admin_set_company_status(uuid,text),public.admin_set_member_role(uuid,text) to authenticated;

alter table public.feature_flags enable row level security;alter table public.site_content enable row level security;alter table public.platform_notifications enable row level security;alter table public.support_tickets enable row level security;alter table public.global_settings enable row level security;
grant select,insert,update,delete on public.feature_flags,public.site_content,public.platform_notifications,public.support_tickets,public.global_settings to authenticated;
create policy flags_read on public.feature_flags for select to authenticated using(true);create policy flags_admin on public.feature_flags for all to authenticated using(is_super_admin()) with check(is_super_admin());
create policy content_read on public.site_content for select to authenticated using(true);create policy content_admin on public.site_content for all to authenticated using(is_super_admin()) with check(is_super_admin());
create policy notifications_read on public.platform_notifications for select to authenticated using(active);create policy notifications_admin on public.platform_notifications for all to authenticated using(is_super_admin()) with check(is_super_admin());
create policy tickets_read on public.support_tickets for select to authenticated using(is_super_admin() or is_company_member(company_id));create policy tickets_insert on public.support_tickets for insert to authenticated with check(created_by=auth.uid() and company_is_active(company_id) and is_company_member(company_id));create policy tickets_update on public.support_tickets for update to authenticated using(is_super_admin() or is_company_admin(company_id));
create policy settings_read on public.global_settings for select to authenticated using(true);create policy settings_admin on public.global_settings for all to authenticated using(is_super_admin()) with check(is_super_admin());
drop policy if exists companies_select on public.companies;create policy companies_select on public.companies for select to authenticated using(is_super_admin() or is_company_member(id));
drop policy if exists companies_update on public.companies;create policy companies_update on public.companies for update to authenticated using(is_super_admin() or is_company_admin(id)) with check(is_super_admin() or is_company_admin(id));
drop policy if exists members_select on public.company_members;create policy members_select on public.company_members for select to authenticated using(is_super_admin() or is_company_member(company_id));
drop policy if exists profiles_select on public.profiles;create policy profiles_select on public.profiles for select to authenticated using(user_id=auth.uid() or is_super_admin() or exists(select 1 from company_members mine join company_members target on target.company_id=mine.company_id where mine.user_id=auth.uid() and target.user_id=profiles.user_id and mine.role in('company_owner','admin')));
drop policy if exists logs_select on public.activity_logs;create policy logs_select on public.activity_logs for select to authenticated using(is_super_admin() or (company_id is not null and is_company_admin(company_id)));
grant insert on public.activity_logs to authenticated;create policy logs_insert_super on public.activity_logs for insert to authenticated with check(is_super_admin() and actor_id=auth.uid());
drop policy if exists transactions_tenant on public.transactions;create policy transactions_tenant on public.transactions for all to authenticated using(company_is_active(company_id) and (is_super_admin() or is_company_member(company_id))) with check(company_is_active(company_id) and created_by=auth.uid() and (is_super_admin() or is_company_member(company_id)));
drop policy if exists goals_tenant on public.goals;create policy goals_tenant on public.goals for all to authenticated using(company_is_active(company_id) and (is_super_admin() or is_company_member(company_id))) with check(company_is_active(company_id) and created_by=auth.uid() and (is_super_admin() or is_company_member(company_id)));
drop policy if exists category_budgets_tenant on public.category_budgets;create policy category_budgets_tenant on public.category_budgets for all to authenticated using(company_is_active(company_id) and (is_super_admin() or is_company_member(company_id))) with check(company_is_active(company_id) and created_by=auth.uid() and (is_super_admin() or is_company_member(company_id)));
create index if not exists companies_plan_status_idx on public.companies(plan,status);create index if not exists tickets_company_status_idx on public.support_tickets(company_id,status);create index if not exists profiles_status_created_idx on public.profiles(status,created_at desc);

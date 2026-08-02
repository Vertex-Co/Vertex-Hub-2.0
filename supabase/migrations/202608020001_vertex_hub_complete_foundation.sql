-- Vertex Hub 2.0: fundação incremental. Execute o CONTEÚDO deste arquivo no SQL Editor.
create extension if not exists pgcrypto;

alter table public.companies add column if not exists plan_started_at timestamptz;
alter table public.companies add column if not exists plan_expires_at timestamptz;
alter table public.companies add column if not exists activation_key_id uuid;

create table if not exists public.plan_limits(
 plan text primary key check(plan in('free','start','growth','prime','enterprise')),
 max_users integer,storage_limit_bytes bigint,max_file_size_bytes bigint,max_units integer,audit_retention_days integer,
 features jsonb not null default '{}'::jsonb,updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
insert into public.plan_limits(plan,max_users,storage_limit_bytes,max_file_size_bytes,max_units,audit_retention_days,features) values
 ('free',1,262144000,10485760,1,7,'{"tasks":true,"crm":true,"documents":false,"export_csv":true}'),
 ('start',3,2147483648,26214400,1,30,'{"tasks":true,"crm":true,"documents":true,"export_pdf":true}'),
 ('growth',10,10737418240,52428800,3,180,'{"tasks":true,"crm":true,"documents":true,"custom_fields":true,"export_xlsx":true}'),
 ('prime',30,32212254720,104857600,10,365,'{"tasks":true,"crm":true,"documents":true,"custom_fields":true,"full_export":true}'),
 ('enterprise',null,null,null,null,null,'{"all":true}') on conflict(plan) do nothing;

create table if not exists public.activation_keys(
 id uuid primary key default gen_random_uuid(),key_hash text not null unique,prefix text not null,plan text not null check(plan in('start','growth','prime','enterprise')),
 duration_months integer check(duration_months in(1,3,12) or duration_months is null),company_id uuid references public.companies(id) on delete set null,
 status text not null default 'available' check(status in('available','used','revoked','expired')),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 used_at timestamptz,used_by uuid references auth.users(id),used_company_id uuid references public.companies(id),expires_at timestamptz,revoked_at timestamptz,revoked_by uuid references auth.users(id)
);
alter table public.companies drop constraint if exists companies_activation_key_id_fkey;
alter table public.companies add constraint companies_activation_key_id_fkey foreign key(activation_key_id) references public.activation_keys(id) on delete set null;

create table if not exists public.company_units(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,name text not null,status text not null default 'active',created_by uuid references auth.users(id),created_at timestamptz not null default now(),unique(company_id,name));
create table if not exists public.tasks(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,unit_id uuid references public.company_units(id) on delete set null,title text not null,description text,assignee_id uuid references auth.users(id),created_by uuid not null references auth.users(id),due_date timestamptz,priority text not null default 'medium' check(priority in('low','medium','high')),status text not null default 'pending' check(status in('pending','in_progress','completed','cancelled')),completed_at timestamptz,deleted_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.clients(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,unit_id uuid references public.company_units(id) on delete set null,name text not null,phone text,email text,tax_id text,address text,responsible_id uuid references auth.users(id),status text not null default 'lead' check(status in('lead','contacted','proposal','negotiation','client','inactive')),notes text,last_contact_at timestamptz,tags text[] not null default '{}',created_by uuid not null references auth.users(id),deleted_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.client_events(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,client_id uuid not null references public.clients(id) on delete cascade,event_type text not null,description text not null,created_by uuid references auth.users(id),created_at timestamptz not null default now());
create table if not exists public.folders(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,parent_id uuid references public.folders(id) on delete set null,name text not null,created_by uuid references auth.users(id),created_at timestamptz not null default now(),deleted_at timestamptz);
create table if not exists public.company_files(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,folder_id uuid references public.folders(id) on delete set null,user_id uuid not null references auth.users(id),file_name text not null,storage_path text not null unique,size_bytes bigint not null check(size_bytes>=0),mime_type text not null,status text not null default 'active',deleted_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.calendar_events(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,unit_id uuid references public.company_units(id) on delete set null,title text not null,description text,event_type text not null default 'internal',starts_at timestamptz not null,ends_at timestamptz,created_by uuid not null references auth.users(id),deleted_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.company_notifications(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,user_id uuid references auth.users(id),title text not null,message text not null,type text not null default 'information',related_type text,related_id uuid,read_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.internal_notes(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,entity_type text not null,entity_id uuid not null,body text not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
create table if not exists public.custom_fields(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,entity_type text not null default 'client',label text not null,field_type text not null check(field_type in('text','number','date','select','boolean')),options jsonb not null default '[]',active boolean not null default true,created_at timestamptz not null default now());

create index if not exists activation_keys_prefix_status_idx on public.activation_keys(prefix,status);
create index if not exists activation_keys_company_idx on public.activation_keys(company_id,created_at desc);
create index if not exists tasks_company_status_due_idx on public.tasks(company_id,status,due_date) where deleted_at is null;
create index if not exists clients_company_status_idx on public.clients(company_id,status,created_at desc) where deleted_at is null;
create index if not exists files_company_created_idx on public.company_files(company_id,created_at desc) where deleted_at is null;
create index if not exists events_company_start_idx on public.calendar_events(company_id,starts_at) where deleted_at is null;
create index if not exists notifications_user_read_idx on public.company_notifications(company_id,user_id,read_at,created_at desc);

create or replace function public.admin_create_activation_key(p_key text,p_plan text,p_duration_months integer default null,p_company_id uuid default null) returns uuid language plpgsql security definer set search_path=public,extensions as $$declare v_id uuid;v_clean text:=upper(trim(p_key));begin
 if not public.is_super_admin() then raise exception 'Acesso negado';end if;
 if p_plan not in('start','growth','prime','enterprise') or (p_duration_months is not null and p_duration_months not in(1,3,12)) then raise exception 'Configuração inválida';end if;
 if v_clean!~'^VX-[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$' then raise exception 'Formato de chave inválido';end if;
 insert into activation_keys(key_hash,prefix,plan,duration_months,company_id,created_by) values(encode(digest(v_clean,'sha256'),'hex'),left(v_clean,8),p_plan,p_duration_months,p_company_id,auth.uid()) returning id into v_id;
 insert into activity_logs(company_id,actor_id,action,entity_type,entity_id,metadata) values(p_company_id,auth.uid(),'activation_key.created','activation_key',v_id,jsonb_build_object('prefix',left(v_clean,8),'plan',p_plan));return v_id;end$$;
create or replace function public.admin_revoke_activation_key(p_key_id uuid) returns void language plpgsql security definer set search_path=public as $$begin if not is_super_admin() then raise exception 'Acesso negado';end if;update activation_keys set status='revoked',revoked_at=now(),revoked_by=auth.uid() where id=p_key_id and status='available';if not found then raise exception 'Chave indisponível';end if;insert into activity_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'activation_key.revoked','activation_key',p_key_id);end$$;
create or replace function public.activate_company_plan(p_company_id uuid,p_key text) returns text language plpgsql security definer set search_path=public,extensions as $$declare k activation_keys%rowtype;v_exp timestamptz;begin
 if not exists(select 1 from company_members where company_id=p_company_id and user_id=auth.uid() and role='company_owner') and not is_super_admin() then raise exception 'Somente o proprietário pode ativar o plano';end if;
 select * into k from activation_keys where key_hash=encode(digest(upper(trim(p_key)),'sha256'),'hex') for update;
 if k.id is null or k.status<>'available' or (k.company_id is not null and k.company_id<>p_company_id) or (k.expires_at is not null and k.expires_at<=now()) then raise exception 'Chave inválida ou indisponível';end if;
 v_exp:=case when k.duration_months is null then null else now()+make_interval(months=>k.duration_months) end;
 update activation_keys set status='used',used_at=now(),used_by=auth.uid(),used_company_id=p_company_id where id=k.id;
 update companies set plan=k.plan,plan_started_at=now(),plan_expires_at=v_exp,activation_key_id=k.id,updated_at=now() where id=p_company_id;
 insert into activity_logs(company_id,actor_id,action,entity_type,entity_id,new_value) values(p_company_id,auth.uid(),'company.plan_activated','company',p_company_id,jsonb_build_object('plan',k.plan,'activation_key_prefix',k.prefix,'expires_at',v_exp));
 insert into company_notifications(company_id,title,message,type) values(p_company_id,'Plano ativado','O plano '||initcap(k.plan)||' foi ativado com sucesso.','plan');return k.plan;end$$;
grant execute on function public.admin_create_activation_key(text,text,integer,uuid) to authenticated;
grant execute on function public.admin_revoke_activation_key(uuid) to authenticated;
grant execute on function public.activate_company_plan(uuid,text) to authenticated;

alter table public.plan_limits enable row level security;alter table public.activation_keys enable row level security;alter table public.company_units enable row level security;alter table public.tasks enable row level security;alter table public.clients enable row level security;alter table public.client_events enable row level security;alter table public.folders enable row level security;alter table public.company_files enable row level security;alter table public.calendar_events enable row level security;alter table public.company_notifications enable row level security;alter table public.internal_notes enable row level security;alter table public.custom_fields enable row level security;
drop policy if exists plan_limits_read on public.plan_limits;create policy plan_limits_read on public.plan_limits for select to authenticated using(true);
drop policy if exists plan_limits_admin on public.plan_limits;create policy plan_limits_admin on public.plan_limits for all to authenticated using(is_super_admin()) with check(is_super_admin());
drop policy if exists activation_keys_admin on public.activation_keys;create policy activation_keys_admin on public.activation_keys for select to authenticated using(is_super_admin());
do $$declare t text;begin foreach t in array array['company_units','tasks','clients','client_events','folders','company_files','calendar_events','company_notifications','internal_notes','custom_fields'] loop execute format('drop policy if exists tenant_access on public.%I',t);execute format('create policy tenant_access on public.%I for all to authenticated using (is_super_admin() or is_company_member(company_id)) with check (company_is_active(company_id) and (is_super_admin() or is_company_member(company_id)))',t);end loop;end$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('company-documents','company-documents',false,104857600,array['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv']) on conflict(id) do update set public=false;
drop policy if exists company_documents_read on storage.objects;create policy company_documents_read on storage.objects for select to authenticated using(bucket_id='company-documents' and (is_super_admin() or is_company_member(((storage.foldername(name))[1])::uuid)));
drop policy if exists company_documents_write on storage.objects;create policy company_documents_write on storage.objects for insert to authenticated with check(bucket_id='company-documents' and is_company_member(((storage.foldername(name))[1])::uuid));

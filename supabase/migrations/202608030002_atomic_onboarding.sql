-- Vertex Hub: onboarding persistente e ativacao atomica.
alter table public.profiles add column if not exists account_type text check(account_type in ('company','employee'));
alter table public.profiles add column if not exists onboarding_state text not null default 'account_created'
  check(onboarding_state in ('account_created','account_type_selected','company_information','company_selected','activation_required','completed'));
alter table public.profiles add column if not exists selected_company_id uuid references public.companies(id) on delete set null;

alter table public.activation_keys add column if not exists key_type text not null default 'employee'
  check(key_type in ('company','employee'));
alter table public.activation_keys add column if not exists max_uses integer not null default 1 check(max_uses > 0);
alter table public.activation_keys add column if not exists use_count integer not null default 0 check(use_count >= 0 and use_count <= max_uses);
alter table public.activation_keys add column if not exists expires_at timestamptz;
update public.activation_keys set use_count=max_uses where status='used' and use_count=0;

create table if not exists public.onboarding_company_drafts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 2 and 160), legal_name text,
 cnpj text not null check(cnpj ~ '^\d{14}$'), phone text check(phone is null or phone ~ '^\d{10,11}$'), email text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists onboarding_company_drafts_cnpj_uidx on public.onboarding_company_drafts(cnpj);
alter table public.onboarding_company_drafts enable row level security;
grant select on public.onboarding_company_drafts to authenticated;
drop policy if exists onboarding_company_drafts_own on public.onboarding_company_drafts;
create policy onboarding_company_drafts_own on public.onboarding_company_drafts for select to authenticated using(user_id=auth.uid());

create or replace function public.ensure_onboarding_profile()
returns public.profiles language plpgsql security definer set search_path=public as $$
declare result public.profiles; u auth.users%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into u from auth.users where id=auth.uid();
 insert into public.profiles(user_id,full_name,email,avatar_url,onboarding_completed,is_authorized,onboarding_state)
 values(u.id,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),split_part(coalesce(u.email,'Usuario'),'@',1)),coalesce(u.email,u.id::text||'@sem-email.local'),coalesce(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture'),false,false,'account_created')
 on conflict(user_id) do nothing;
 select * into result from public.profiles where user_id=auth.uid(); return result;
end $$;

create or replace function public.set_onboarding_account_type(p_account_type text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if p_account_type not in ('company','employee') then raise exception 'invalid_account_type'; end if;
 perform public.ensure_onboarding_profile();
 update public.profiles set account_type=p_account_type,selected_company_id=null,onboarding_state='account_type_selected',updated_at=now() where user_id=auth.uid() and not onboarding_completed;
 if not found then raise exception 'onboarding_already_completed'; end if;
 delete from public.onboarding_company_drafts where user_id=auth.uid();
end $$;

create or replace function public.save_onboarding_company(p_name text,p_legal_name text,p_cnpj text,p_phone text,p_email text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if not exists(select 1 from public.profiles where user_id=auth.uid() and account_type='company' and not onboarding_completed) then raise exception 'invalid_onboarding_flow'; end if;
 if trim(p_name)='' or p_cnpj !~ '^\d{14}$' or (nullif(p_phone,'') is not null and p_phone !~ '^\d{10,11}$') then raise exception 'invalid_company_data'; end if;
 if exists(select 1 from public.companies where cnpj=p_cnpj) then raise exception 'cnpj_already_registered'; end if;
 insert into public.onboarding_company_drafts(user_id,name,legal_name,cnpj,phone,email,updated_at)
 values(auth.uid(),trim(p_name),nullif(trim(p_legal_name),''),p_cnpj,nullif(p_phone,''),nullif(lower(trim(p_email)),''),now())
 on conflict(user_id) do update set name=excluded.name,legal_name=excluded.legal_name,cnpj=excluded.cnpj,phone=excluded.phone,email=excluded.email,updated_at=now();
 update public.profiles set onboarding_state='activation_required',updated_at=now() where user_id=auth.uid();
end $$;

create or replace function public.search_onboarding_companies(p_query text default '')
returns table(id uuid,name text) language sql stable security definer set search_path=public as $$
 select c.id,c.name from public.companies c where c.status='active'
 and exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.account_type='employee' and not p.onboarding_completed)
 and (trim(p_query)='' or c.name ilike '%'||trim(p_query)||'%') order by c.name limit 20
$$;

create or replace function public.select_onboarding_company(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if not exists(select 1 from public.companies where id=p_company_id and status='active') then raise exception 'company_not_found'; end if;
 update public.profiles set selected_company_id=p_company_id,onboarding_state='activation_required',updated_at=now()
 where user_id=auth.uid() and account_type='employee' and not onboarding_completed;
 if not found then raise exception 'invalid_onboarding_flow'; end if;
end $$;

create or replace function public.admin_create_onboarding_key(p_key_type text,p_company_id uuid default null,p_expires_at timestamptz default null)
returns text language plpgsql security definer set search_path=public,extensions as $$
declare v_key text; v_hash text;
begin
 if not public.is_super_admin() then raise exception 'not_authorized'; end if;
 if p_key_type not in ('company','employee') then raise exception 'invalid_key_type'; end if;
 if p_key_type='company' and p_company_id is not null then raise exception 'company_key_must_be_unassigned'; end if;
 if p_key_type='employee' and (p_company_id is null or not exists(select 1 from public.companies where id=p_company_id and status='active')) then raise exception 'company_required'; end if;
 v_key:='VX-'||upper(substr(encode(gen_random_bytes(15),'hex'),1,5))||'-'||upper(substr(encode(gen_random_bytes(15),'hex'),6,5))||'-'||upper(substr(encode(gen_random_bytes(15),'hex'),11,5))||'-'||upper(substr(encode(gen_random_bytes(15),'hex'),16,5));
 v_hash:=encode(digest(v_key,'sha256'),'hex');
 insert into public.activation_keys(key_hash,prefix,status,company_id,created_by,created_at,key_type,max_uses,use_count,expires_at)
 values(v_hash,left(v_key,9),'available',p_company_id,auth.uid(),now(),p_key_type,1,0,p_expires_at);
 return v_key;
end $$;

create or replace function public.complete_activation_onboarding(p_activation_key text)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare k public.activation_keys%rowtype; p public.profiles%rowtype; d public.onboarding_company_drafts%rowtype; cid uuid; member_role text;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.profiles where user_id=auth.uid() for update;
 if not found or p.account_type is null or p.onboarding_state<>'activation_required' or p.onboarding_completed then raise exception 'onboarding_not_ready'; end if;
 select * into k from public.activation_keys where key_hash=encode(digest(upper(trim(p_activation_key)),'sha256'),'hex') for update;
 if not found then raise exception 'invalid_activation_key'; end if;
 if k.status<>'available' or k.use_count>=k.max_uses then raise exception 'activation_key_unavailable'; end if;
 if k.expires_at is not null and k.expires_at<=now() then raise exception 'activation_key_expired'; end if;
 if k.key_type<>p.account_type then raise exception 'activation_key_wrong_type'; end if;

 if p.account_type='company' then
   if k.company_id is not null then raise exception 'activation_key_wrong_company'; end if;
   select * into d from public.onboarding_company_drafts where user_id=auth.uid() for update;
   if not found then raise exception 'company_information_missing'; end if;
   if exists(select 1 from public.companies where cnpj=d.cnpj) then raise exception 'cnpj_already_registered'; end if;
   insert into public.companies(name,legal_name,cnpj,phone,email) values(d.name,d.legal_name,d.cnpj,d.phone,d.email) returning id into cid;
   insert into public.company_settings(company_id) values(cid);
   member_role:='company_owner';
 else
   cid:=p.selected_company_id;
   if cid is null or k.company_id is distinct from cid then raise exception 'activation_key_wrong_company'; end if;
   if not exists(select 1 from public.companies where id=cid and status='active') then raise exception 'company_unavailable'; end if;
   member_role:='member';
 end if;

 insert into public.company_members(company_id,user_id,role) values(cid,auth.uid(),member_role)
 on conflict(company_id,user_id) do update set role=case when excluded.role='company_owner' then excluded.role else public.company_members.role end;
 update public.profiles set is_authorized=true,authorized_at=now(),authorized_company_id=cid,onboarding_completed=true,onboarding_state='completed',selected_company_id=cid,updated_at=now() where user_id=auth.uid();
 if not exists(select 1 from public.company_members where company_id=cid and user_id=auth.uid())
    or not exists(select 1 from public.profiles where user_id=auth.uid() and is_authorized and onboarding_completed and authorized_company_id=cid) then
   raise exception 'access_confirmation_failed';
 end if;
 update public.activation_keys set use_count=use_count+1,status=case when use_count+1>=max_uses then 'used' else 'available' end,used_by=auth.uid(),used_at=now(),company_id=coalesce(company_id,cid) where id=k.id;
 delete from public.onboarding_company_drafts where user_id=auth.uid();
 insert into public.activity_logs(company_id,actor_id,action,entity_type,entity_id,metadata) values(cid,auth.uid(),'onboarding.completed','activation_key',k.id,jsonb_build_object('account_type',p.account_type,'role',member_role));
 return cid;
end $$;

create or replace view public.activation_key_inconsistencies with (security_invoker=true) as
select k.id,k.prefix,k.company_id,k.used_by,k.used_at,
 case when m.id is null then 'missing_membership' when not coalesce(p.onboarding_completed,false) then 'onboarding_incomplete' when not coalesce(p.is_authorized,false) then 'profile_not_authorized' end as issue
from public.activation_keys k left join public.company_members m on m.company_id=k.company_id and m.user_id=k.used_by left join public.profiles p on p.user_id=k.used_by
where k.status='used' and (m.id is null or not coalesce(p.onboarding_completed,false) or not coalesce(p.is_authorized,false));

create or replace view public.activation_keys_admin with (security_invoker=true) as
select k.id,k.prefix,k.status,k.company_id,k.created_at,k.used_at,
 creator.email as created_by_email,consumer.email as used_by_email,k.key_type,k.expires_at,k.use_count,k.max_uses
from public.activation_keys k left join public.profiles creator on creator.user_id=k.created_by left join public.profiles consumer on consumer.user_id=k.used_by;

revoke all on function public.ensure_onboarding_profile() from public;
revoke all on function public.set_onboarding_account_type(text) from public;
revoke all on function public.save_onboarding_company(text,text,text,text,text) from public;
revoke all on function public.search_onboarding_companies(text) from public;
revoke all on function public.select_onboarding_company(uuid) from public;
revoke all on function public.complete_activation_onboarding(text) from public;
revoke all on function public.admin_create_onboarding_key(text,uuid,timestamptz) from public;
grant execute on function public.ensure_onboarding_profile(),public.set_onboarding_account_type(text),public.save_onboarding_company(text,text,text,text,text),public.search_onboarding_companies(text),public.select_onboarding_company(uuid),public.complete_activation_onboarding(text),public.admin_create_onboarding_key(text,uuid,timestamptz) to authenticated;
grant select on public.activation_key_inconsistencies to authenticated;
drop policy if exists activation_key_inconsistencies_admin on public.activation_keys;

-- Vertex Hub: autorização permanente por empresa, sem planos comerciais.
alter table public.profiles add column if not exists is_authorized boolean not null default false;
alter table public.profiles add column if not exists authorized_at timestamptz;
alter table public.profiles add column if not exists authorized_company_id uuid references public.companies(id) on delete set null;

alter table public.activation_keys add column if not exists key_hash text;
alter table public.activation_keys add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.activation_keys add column if not exists used_by uuid references auth.users(id) on delete set null;
alter table public.activation_keys add column if not exists cancelled_at timestamptz;
alter table public.activation_keys alter column plan drop not null;
alter table public.activation_keys alter column duration_months drop not null;
alter table public.activation_keys drop constraint if exists activation_keys_status_check;
update public.activation_keys set status='cancelled',cancelled_at=coalesce(revoked_at,now()) where status in('revoked','expired');
alter table public.activation_keys add constraint activation_keys_status_check check(status in('available','used','cancelled'));
drop trigger if exists enforce_company_member_limit_trigger on public.company_members;
drop function if exists public.enforce_company_member_limit();

create unique index if not exists activation_keys_key_hash_uidx on public.activation_keys(key_hash) where key_hash is not null;
create index if not exists activation_keys_company_status_idx on public.activation_keys(company_id,status);

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.global_role='super_admin');
$$;

create or replace function public.admin_create_activation_key(p_company_id uuid)
returns text language plpgsql security definer set search_path=public,extensions as $$
declare v_key text; v_hash text;
begin
  if not public.is_super_admin() then raise exception 'not_authorized'; end if;
  if not exists(select 1 from public.companies where id=p_company_id) then raise exception 'company_not_found'; end if;
  v_key := 'VX-' || upper(substr(encode(gen_random_bytes(15),'hex'),1,5)) || '-' || upper(substr(encode(gen_random_bytes(15),'hex'),6,5)) || '-' || upper(substr(encode(gen_random_bytes(15),'hex'),11,5)) || '-' || upper(substr(encode(gen_random_bytes(15),'hex'),16,5));
  v_hash := encode(digest(v_key,'sha256'),'hex');
  insert into public.activation_keys(key_hash,prefix,status,company_id,created_by,created_at)
  values(v_hash,left(v_key,9),'available',p_company_id,auth.uid(),now());
  insert into public.activity_logs(company_id,actor_id,action,entity_type,entity_id,metadata)
  values(p_company_id,auth.uid(),'activation_key.created','activation_key',p_company_id,jsonb_build_object('company_id',p_company_id));
  return v_key;
end $$;

create or replace function public.consume_activation_key(p_key text)
returns void language plpgsql security definer set search_path=public,extensions as $$
declare v_key public.activation_keys%rowtype; v_email text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_key from public.activation_keys
  where key_hash=encode(digest(upper(trim(p_key)),'sha256'),'hex') for update;
  if not found or v_key.status<>'available' then raise exception 'invalid_key'; end if;
  select email into v_email from auth.users where id=auth.uid();
  update public.activation_keys set status='used',used_by=auth.uid(),used_at=now() where id=v_key.id and status='available';
  if not found then raise exception 'key_already_used'; end if;
  insert into public.company_members(company_id,user_id,role) values(v_key.company_id,auth.uid(),'member') on conflict(company_id,user_id) do nothing;
  update public.profiles set is_authorized=true,authorized_at=now(),authorized_company_id=v_key.company_id,onboarding_completed=true where user_id=auth.uid();
  insert into public.activity_logs(company_id,actor_id,action,entity_type,entity_id,metadata)
  values(v_key.company_id,auth.uid(),'account.authorized','profile',auth.uid(),jsonb_build_object('email',v_email));
end $$;

create or replace function public.admin_cancel_activation_key(p_key_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_super_admin() then raise exception 'not_authorized'; end if;
  update public.activation_keys set status='cancelled',cancelled_at=now() where id=p_key_id and status='available';
  if not found then raise exception 'key_not_available'; end if;
  insert into public.activity_logs(company_id,actor_id,action,entity_type,entity_id)
  select company_id,auth.uid(),'activation_key.cancelled','activation_key',id from public.activation_keys where id=p_key_id;
end $$;

create or replace view public.activation_keys_admin with (security_invoker=true) as
select k.id,k.prefix,k.status,k.company_id,k.created_at,k.used_at,
  creator.email as created_by_email,consumer.email as used_by_email
from public.activation_keys k left join public.profiles creator on creator.user_id=k.created_by left join public.profiles consumer on consumer.user_id=k.used_by;

alter table public.activation_keys enable row level security;
drop policy if exists "Super admins manage activation keys" on public.activation_keys;
create policy "Super admins manage activation keys" on public.activation_keys for all using(public.is_super_admin()) with check(public.is_super_admin());
revoke all on function public.admin_create_activation_key(uuid) from public;
revoke all on function public.admin_cancel_activation_key(uuid) from public;
grant execute on function public.admin_create_activation_key(uuid) to authenticated;
grant execute on function public.admin_cancel_activation_key(uuid) to authenticated;
grant execute on function public.consume_activation_key(text) to authenticated;
grant select on public.activation_keys_admin to authenticated;
update public.profiles p set is_authorized=true,authorized_at=coalesce(authorized_at,now())
where exists(select 1 from public.company_members m where m.user_id=p.user_id);
revoke update on public.profiles from authenticated;
grant update(full_name,phone,cpf,avatar_url,updated_at) on public.profiles to authenticated;

-- O frontend deixa de depender do modelo comercial antigo. As colunas são
-- removidas somente nesta migration, preservando as demais informações.
drop function if exists public.activate_company_plan(uuid,text);
drop function if exists public.admin_create_activation_key(text,text,integer,uuid);
drop function if exists public.admin_revoke_activation_key(uuid);
drop table if exists public.plan_benefits cascade;
drop table if exists public.plan_settings cascade;
drop table if exists public.plan_limits cascade;
alter table public.companies drop column if exists plan_started_at;
alter table public.companies drop column if exists plan_expires_at;
alter table public.companies drop column if exists activation_key_id;
alter table public.companies drop column if exists plan;
alter table public.companies drop column if exists enterprise_user_limit;
alter table public.companies drop column if exists enterprise_storage_gb;
alter table public.companies drop column if exists enterprise_financial_assistance;
alter table public.companies drop column if exists enterprise_notes;
alter table public.activation_keys drop column if exists plan;
alter table public.activation_keys drop column if exists duration_months;
alter table public.activation_keys drop column if exists expires_at;
alter table public.activation_keys drop column if exists revoked_at;
alter table public.activation_keys drop column if exists revoked_by;

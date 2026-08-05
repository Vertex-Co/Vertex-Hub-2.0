-- Vertex Hub: endurecimento de identidade, roles, multiempresa e MFA.

-- Limpa overloads sem identidade explícita caso uma tentativa anterior tenha
-- sido executada parcialmente pelo SQL Editor.
drop function if exists public.is_super_admin();
drop function if exists public.is_company_member(uuid);
drop function if exists public.is_company_writer(uuid);
drop function if exists public.is_company_owner(uuid);

-- A autoridade Super Admin exige role ativa E sessão MFA AAL2.
create or replace function public.is_super_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,auth as $$
  select uid=auth.uid()
    and coalesce(auth.jwt()->>'aal','aal1') = 'aal2'
    and exists(select 1 from public.profiles p where p.user_id=uid and p.global_role='super_admin' and p.status='active')
$$;
revoke all on function public.is_super_admin(uuid) from public,anon;
grant execute on function public.is_super_admin(uuid) to authenticated;

-- Helpers nunca aceitam identidade indicada pelo navegador.
create or replace function public.is_company_member(cid uuid,uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
 select uid=auth.uid() and (public.is_super_admin(uid) or exists(select 1 from public.company_members m where m.company_id=cid and m.user_id=uid))
$$;
create or replace function public.is_company_writer(cid uuid,uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
 select uid=auth.uid() and (public.is_super_admin(uid) or exists(select 1 from public.company_members m join public.profiles p on p.user_id=m.user_id where m.company_id=cid and m.user_id=uid and m.role in('company_owner','admin') and p.status='active'))
$$;
create or replace function public.is_company_owner(cid uuid,uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
 select uid=auth.uid() and (public.is_super_admin(uid) or exists(select 1 from public.company_members m where m.company_id=cid and m.user_id=uid and m.role='company_owner'))
$$;
revoke all on function public.is_company_member(uuid,uuid),public.is_company_writer(uuid,uuid),public.is_company_owner(uuid,uuid) from public,anon;
grant execute on function public.is_company_member(uuid,uuid),public.is_company_writer(uuid,uuid),public.is_company_owner(uuid,uuid) to authenticated;

-- Defesa em profundidade: nem policy permissiva futura permite autopromoção.
create or replace function public.protect_profile_security_fields()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if auth.uid()=old.user_id and not public.is_super_admin() and
   (new.user_id is distinct from old.user_id or new.global_role is distinct from old.global_role or
    new.status is distinct from old.status or new.is_authorized is distinct from old.is_authorized or
    new.authorized_company_id is distinct from old.authorized_company_id or
    new.account_type is distinct from old.account_type or new.onboarding_completed is distinct from old.onboarding_completed)
 then raise exception 'protected_profile_fields' using errcode='42501'; end if;
 return new;
end$$;
drop trigger if exists protect_profile_security_fields_trigger on public.profiles;
create trigger protect_profile_security_fields_trigger before update on public.profiles
for each row execute function public.protect_profile_security_fields();

-- Alterações de vínculo passam exclusivamente por RPC/Edge Function autorizada.
revoke insert,update,delete on public.company_members from authenticated;

-- Leitura mínima e segura para o cliente autenticado.
create or replace function public.get_my_security_context()
returns table(user_id uuid,global_role text,status text,aal text,mfa_required boolean,mfa_verified boolean)
language sql stable security definer set search_path=public,auth as $$
 select p.user_id,p.global_role::text,p.status,coalesce(auth.jwt()->>'aal','aal1'),
        p.global_role='super_admin',coalesce(auth.jwt()->>'aal','aal1')='aal2'
 from public.profiles p where p.user_id=auth.uid()
$$;
revoke all on function public.get_my_security_context() from public,anon;
grant execute on function public.get_my_security_context() to authenticated;

-- Registro sanitizado de eventos MFA (nunca recebe ou persiste segredo/código).
create or replace function public.log_mfa_event(p_action text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if p_action not in ('mfa.enrolled','mfa.verified','mfa.unenrolled') then raise exception 'invalid_action'; end if;
 insert into public.activity_logs(actor_id,action,entity_type,metadata)
 values(auth.uid(),p_action,'auth_factor',jsonb_build_object('aal',coalesce(auth.jwt()->>'aal','aal1')));
end$$;
revoke all on function public.log_mfa_event(text) from public,anon;
grant execute on function public.log_mfa_event(text) to authenticated;

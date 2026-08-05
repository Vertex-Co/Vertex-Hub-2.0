-- Reparo para projetos em que a primeira versao da migration MFA foi
-- executada parcialmente e deixou overloads ambiguos.
begin;

drop function if exists public.is_company_member(uuid);
drop function if exists public.is_company_writer(uuid);
drop function if exists public.is_company_owner(uuid);
drop function if exists public.is_super_admin();

-- As assinaturas historicas permanecem unicas e compativeis com as policies.
create or replace function public.is_super_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public,auth as $$
 select uid=auth.uid()
   and coalesce(auth.jwt()->>'aal','aal1')='aal2'
   and exists(select 1 from public.profiles p where p.user_id=uid and p.global_role='super_admin' and p.status='active')
$$;

create or replace function public.is_company_member(cid uuid,uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
 select uid=auth.uid() and (public.is_super_admin(uid) or exists(
   select 1 from public.company_members m where m.company_id=cid and m.user_id=uid
 ))
$$;

create or replace function public.is_company_writer(cid uuid,uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
 select uid=auth.uid() and (public.is_super_admin(uid) or exists(
   select 1 from public.company_members m join public.profiles p on p.user_id=m.user_id
   where m.company_id=cid and m.user_id=uid and m.role in('company_owner','admin') and p.status='active'
 ))
$$;

create or replace function public.is_company_owner(cid uuid,uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
 select uid=auth.uid() and (public.is_super_admin(uid) or exists(
   select 1 from public.company_members m where m.company_id=cid and m.user_id=uid and m.role='company_owner'
 ))
$$;

revoke all on function public.is_super_admin(uuid),public.is_company_member(uuid,uuid),public.is_company_writer(uuid,uuid),public.is_company_owner(uuid,uuid) from public,anon;
grant execute on function public.is_super_admin(uuid),public.is_company_member(uuid,uuid),public.is_company_writer(uuid,uuid),public.is_company_owner(uuid,uuid) to authenticated;

commit;

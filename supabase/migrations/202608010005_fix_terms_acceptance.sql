-- Correção robusta do aceite de Termos e atualização do cache do PostgREST.
grant select,insert on public.terms_acceptances to authenticated;
drop policy if exists terms_insert_own on public.terms_acceptances;
create policy terms_insert_own on public.terms_acceptances for insert to authenticated
with check(user_id=auth.uid() and terms_type in('usage','commercial'));

create or replace function public.accept_terms(p_type text,p_version text,p_company_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is null then raise exception using errcode='42501',message='Sessão inválida';end if;
 if p_type not in('usage','commercial') then raise exception using errcode='22023',message='Tipo de termo inválido';end if;
 insert into public.terms_acceptances(user_id,terms_type,terms_version,company_id,accepted_at)
 values(auth.uid(),p_type,p_version,p_company_id,now()) on conflict do nothing;
end$$;
revoke all on function public.accept_terms(text,text,uuid) from public;
grant execute on function public.accept_terms(text,text,uuid) to authenticated;
notify pgrst,'reload schema';

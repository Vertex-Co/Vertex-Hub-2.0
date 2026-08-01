-- Empresas sem CNPJ são permitidas. Valores informados continuam únicos e validados.
alter table public.companies alter column cnpj drop not null;

create or replace function public.complete_company_onboarding(p_full_name text,p_phone text,p_cpf text,p_company_name text,p_legal_name text,p_cnpj text,p_company_phone text,p_company_email text)
returns uuid language plpgsql security definer set search_path=public as $$declare cid uuid; mail text; normalized_cnpj text;begin
 if auth.uid() is null then raise exception 'Sessão inválida'; end if;
 normalized_cnpj:=nullif(trim(p_cnpj),'');
 if p_cpf !~ '^\d{11}$' or p_phone !~ '^\d{10,11}$' or (normalized_cnpj is not null and normalized_cnpj !~ '^\d{14}$') then raise exception 'Dados normalizados inválidos'; end if;
 select email into mail from auth.users where id=auth.uid();
 insert into profiles(user_id,full_name,email,phone,cpf,onboarding_completed) values(auth.uid(),trim(p_full_name),mail,p_phone,p_cpf,false)
 on conflict(user_id) do update set full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,cpf=excluded.cpf,updated_at=now();
 insert into companies(name,legal_name,cnpj,phone,email) values(trim(p_company_name),nullif(trim(p_legal_name),''),normalized_cnpj,nullif(p_company_phone,''),nullif(lower(trim(p_company_email)),'')) returning id into cid;
 insert into company_members(company_id,user_id,role) values(cid,auth.uid(),'company_owner');
 insert into company_settings(company_id) values(cid);
 update profiles set onboarding_completed=true,updated_at=now() where user_id=auth.uid();
 insert into activity_logs(company_id,actor_id,action,entity_type,entity_id) values(cid,auth.uid(),'company.created','company',cid); return cid;
end$$;
revoke all on function public.complete_company_onboarding(text,text,text,text,text,text,text,text) from public;
grant execute on function public.complete_company_onboarding(text,text,text,text,text,text,text,text) to authenticated;

-- Para promover a primeira conta, troque o e-mail e execute no SQL Editor:
-- update public.profiles set global_role='super_admin',updated_at=now() where lower(email)=lower('seu@email.com');

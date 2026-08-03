-- Sincroniza dados de acesso do Supabase Auth com o diretorio publico seguro.
update public.profiles p
set last_seen_at=u.last_sign_in_at,
    auth_method=coalesce(nullif(u.raw_app_meta_data->>'provider',''),case when u.encrypted_password is not null then 'email' else 'unknown' end),
    updated_at=now()
from auth.users u
where u.id=p.user_id;

create or replace function public.record_login_activity()
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 update public.profiles p
 set last_seen_at=coalesce(u.last_sign_in_at,now()),
     auth_method=coalesce(nullif(u.raw_app_meta_data->>'provider',''),case when u.encrypted_password is not null then 'email' else 'unknown' end),
     updated_at=now()
 from auth.users u
 where u.id=auth.uid() and p.user_id=u.id;
end $$;

revoke all on function public.record_login_activity() from public;
grant execute on function public.record_login_activity() to authenticated;

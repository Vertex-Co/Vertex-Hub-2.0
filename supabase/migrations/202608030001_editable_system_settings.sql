-- Configurações editáveis do sistema, reutilizando global_settings.
insert into public.global_settings(key,value) values
  ('system_version','2.0.0'),
  ('system_environment','Produção'),
  ('system_database','Supabase'),
  ('system_status','Operacional')
on conflict(key) do nothing;

create or replace function public.admin_save_system_settings(
  p_version text,
  p_environment text,
  p_database text,
  p_status text
) returns void
language plpgsql
security definer
set search_path=public
as $$
declare old_settings jsonb;
begin
  if not public.is_super_admin() then raise exception 'not_authorized'; end if;
  if nullif(trim(p_version),'') is null or char_length(trim(p_version))>32 then raise exception 'invalid_version'; end if;
  if nullif(trim(p_environment),'') is null or char_length(trim(p_environment))>80 then raise exception 'invalid_environment'; end if;
  if nullif(trim(p_database),'') is null or char_length(trim(p_database))>80 then raise exception 'invalid_database'; end if;
  if p_status not in('Operacional','Manutenção','Instabilidade','Indisponível') then raise exception 'invalid_status'; end if;
  select jsonb_object_agg(key,value) into old_settings from public.global_settings where key like 'system_%';
  insert into public.global_settings(key,value,updated_by,updated_at) values
    ('system_version',trim(p_version),auth.uid(),now()),
    ('system_environment',trim(p_environment),auth.uid(),now()),
    ('system_database',trim(p_database),auth.uid(),now()),
    ('system_status',p_status,auth.uid(),now())
  on conflict(key) do update set value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  insert into public.activity_logs(actor_id,action,entity_type,old_value,new_value)
  values(auth.uid(),'system.settings_changed','global_settings',old_settings,jsonb_build_object('version',trim(p_version),'environment',trim(p_environment),'database',trim(p_database),'status',p_status));
end $$;

revoke all on function public.admin_save_system_settings(text,text,text,text) from public;
grant execute on function public.admin_save_system_settings(text,text,text,text) to authenticated;

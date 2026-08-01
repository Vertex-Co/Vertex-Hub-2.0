-- Impede que uma falha secundária no aceite cancele a criação do usuário Auth.
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path=public as $$begin
 insert into public.profiles(user_id,full_name,email,avatar_url,onboarding_completed)
 values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),nullif(new.raw_user_meta_data->>'name',''),split_part(coalesce(new.email,'Usuário'),'@',1)),coalesce(new.email,new.id::text||'@sem-email.local'),coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture'),false)
 on conflict(user_id) do nothing;
 if new.raw_user_meta_data->>'terms_version' is not null then
  begin
   insert into public.terms_acceptances(user_id,terms_type,terms_version,accepted_at)
   values(new.id,'usage',new.raw_user_meta_data->>'terms_version',now()) on conflict do nothing;
  exception when others then null;
  end;
 end if;
 return new;
end$$;
drop trigger if exists on_auth_user_created_vertex on auth.users;
create trigger on_auth_user_created_vertex after insert on auth.users for each row execute function public.handle_new_auth_user();
notify pgrst,'reload schema';

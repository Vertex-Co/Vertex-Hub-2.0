-- Employee e demais papeis nao administrativos: leitura apenas na propria empresa.
create or replace function public.is_company_writer(cid uuid,uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
 select public.is_super_admin(uid) or exists(select 1 from public.company_members m where m.company_id=cid and m.user_id=uid and m.role in('company_owner','admin'))
$$;
create or replace function public.is_company_owner(cid uuid,uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
 select public.is_super_admin(uid) or exists(select 1 from public.company_members m where m.company_id=cid and m.user_id=uid and m.role='company_owner')
$$;
revoke all on function public.is_company_writer(uuid,uuid),public.is_company_owner(uuid,uuid) from public;
grant execute on function public.is_company_writer(uuid,uuid),public.is_company_owner(uuid,uuid) to authenticated;

-- Preferencias pessoais continuam editaveis pelas colunas explicitamente
-- concedidas na migration de autorizacao; papeis e vinculos nao fazem parte do grant.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
using(user_id=auth.uid() or public.is_super_admin())
with check(user_id=auth.uid() or public.is_super_admin());

drop policy if exists transactions_tenant on public.transactions;
create policy transactions_read on public.transactions for select to authenticated using(public.company_is_active(company_id) and public.is_company_member(company_id));
create policy transactions_write_insert on public.transactions for insert to authenticated with check(public.company_is_active(company_id) and public.is_company_writer(company_id) and created_by=auth.uid());
create policy transactions_write_update on public.transactions for update to authenticated using(public.is_company_writer(company_id)) with check(public.company_is_active(company_id) and public.is_company_writer(company_id));
create policy transactions_write_delete on public.transactions for delete to authenticated using(public.is_company_writer(company_id));

drop policy if exists goals_tenant on public.goals;
create policy goals_read on public.goals for select to authenticated using(public.company_is_active(company_id) and public.is_company_member(company_id));
create policy goals_write_insert on public.goals for insert to authenticated with check(public.company_is_active(company_id) and public.is_company_writer(company_id) and created_by=auth.uid());
create policy goals_write_update on public.goals for update to authenticated using(public.is_company_writer(company_id)) with check(public.company_is_active(company_id) and public.is_company_writer(company_id));
create policy goals_write_delete on public.goals for delete to authenticated using(public.is_company_writer(company_id));

drop policy if exists category_budgets_tenant on public.category_budgets;
create policy category_budgets_read on public.category_budgets for select to authenticated using(public.company_is_active(company_id) and public.is_company_member(company_id));
create policy category_budgets_write_insert on public.category_budgets for insert to authenticated with check(public.company_is_active(company_id) and public.is_company_writer(company_id) and created_by=auth.uid());
create policy category_budgets_write_update on public.category_budgets for update to authenticated using(public.is_company_writer(company_id)) with check(public.company_is_active(company_id) and public.is_company_writer(company_id));
create policy category_budgets_write_delete on public.category_budgets for delete to authenticated using(public.is_company_writer(company_id));

drop policy if exists company_settings_all on public.company_settings;
create policy company_settings_read on public.company_settings for select to authenticated using(public.is_company_member(company_id));
create policy company_settings_write on public.company_settings for update to authenticated using(public.is_company_writer(company_id)) with check(public.is_company_writer(company_id));

do $$declare t text;begin
 foreach t in array array['company_units','tasks','clients','client_events','folders','company_files','calendar_events','company_notifications','internal_notes','custom_fields'] loop
  execute format('drop policy if exists tenant_access on public.%I',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using (public.is_company_member(company_id))',t);
  execute format('create policy tenant_insert on public.%I for insert to authenticated with check (public.company_is_active(company_id) and public.is_company_writer(company_id))',t);
  execute format('create policy tenant_update on public.%I for update to authenticated using (public.is_company_writer(company_id)) with check (public.company_is_active(company_id) and public.is_company_writer(company_id))',t);
  execute format('create policy tenant_delete on public.%I for delete to authenticated using (public.is_company_writer(company_id))',t);
 end loop;
end$$;

drop policy if exists company_documents_write on storage.objects;
drop policy if exists company_documents_update on storage.objects;
drop policy if exists company_documents_delete on storage.objects;
create policy company_documents_write on storage.objects for insert to authenticated with check(bucket_id='company-documents' and public.is_company_writer(((storage.foldername(name))[1])::uuid));
create policy company_documents_update on storage.objects for update to authenticated using(bucket_id='company-documents' and public.is_company_writer(((storage.foldername(name))[1])::uuid)) with check(bucket_id='company-documents' and public.is_company_writer(((storage.foldername(name))[1])::uuid));
create policy company_documents_delete on storage.objects for delete to authenticated using(bucket_id='company-documents' and public.is_company_writer(((storage.foldername(name))[1])::uuid));

drop policy if exists tickets_insert on public.support_tickets;
drop policy if exists tickets_update on public.support_tickets;
create policy tickets_insert on public.support_tickets for insert to authenticated with check(created_by=auth.uid() and public.company_is_active(company_id) and public.is_company_writer(company_id));
create policy tickets_update on public.support_tickets for update to authenticated using(public.is_company_writer(company_id)) with check(public.is_company_writer(company_id));

-- Correções server-side para documentos e módulos operacionais.
create or replace function public.authorize_document_upload(p_company_id uuid,p_size_bytes bigint,p_mime_type text) returns boolean language plpgsql security definer set search_path=public as $$declare v_limit bigint;v_file_limit bigint;v_used bigint;v_plan text;begin
 if not company_is_active(p_company_id) or not is_company_member(p_company_id) then raise exception 'Acesso negado';end if;
 if p_size_bytes<=0 or p_mime_type not in('application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv') then raise exception 'Arquivo inválido';end if;
 perform pg_advisory_xact_lock(hashtext(p_company_id::text));select plan into v_plan from companies where id=p_company_id;select storage_limit_bytes,max_file_size_bytes into v_limit,v_file_limit from plan_limits where plan=v_plan;
 if v_file_limit is not null and p_size_bytes>v_file_limit then raise exception 'Arquivo acima do limite do plano';end if;
 select coalesce(sum(size_bytes),0) into v_used from company_files where company_id=p_company_id and deleted_at is null;
 if v_limit is not null and v_used+p_size_bytes>v_limit then raise exception 'Limite de armazenamento atingido';end if;return true;end$$;
grant execute on function public.authorize_document_upload(uuid,bigint,text) to authenticated;
drop policy if exists company_documents_update on storage.objects;create policy company_documents_update on storage.objects for update to authenticated using(bucket_id='company-documents' and is_company_member(((storage.foldername(name))[1])::uuid)) with check(bucket_id='company-documents' and is_company_member(((storage.foldername(name))[1])::uuid));
drop policy if exists company_documents_delete on storage.objects;create policy company_documents_delete on storage.objects for delete to authenticated using(bucket_id='company-documents' and is_company_member(((storage.foldername(name))[1])::uuid));
alter table public.tasks add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.tasks add column if not exists completed_by uuid references auth.users(id) on delete set null;
alter table public.clients add column if not exists client_type text default 'individual' check(client_type in('individual','company'));
alter table public.clients add column if not exists whatsapp text;
alter table public.calendar_events add column if not exists task_id uuid references public.tasks(id) on delete set null;
alter table public.calendar_events add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.calendar_events add column if not exists responsible_id uuid references auth.users(id) on delete set null;
alter table public.calendar_events add column if not exists all_day boolean not null default false;

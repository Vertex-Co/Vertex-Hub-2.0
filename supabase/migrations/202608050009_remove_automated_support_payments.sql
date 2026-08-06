-- Remoção segura do fluxo automatizado de apoio.
-- Faça exportação de public.vertex_support_payments antes de executar se o
-- histórico legado precisar ser retido para fins contábeis.
do $$ begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vertex_support_payments'
  ) then
    alter publication supabase_realtime drop table public.vertex_support_payments;
  end if;
end $$;

drop view if exists public.vertex_support_summary;
drop function if exists public.vertex_support_badge(numeric);
drop table if exists public.vertex_support_payments;

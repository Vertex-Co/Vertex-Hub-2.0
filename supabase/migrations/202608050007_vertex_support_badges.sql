create or replace function public.vertex_support_badge(total numeric)
returns text language sql immutable set search_path = public as $$
  select case
    when total >= 250 then '👑 Supporter V'
    when total >= 100 then '💎 Supporter IV'
    when total >= 50 then '🚀 Supporter III'
    when total >= 25 then '⚡ Supporter II'
    when total >= 5 then '💙 Supporter I'
    else 'Sem badge'
  end
$$;

revoke all on function public.vertex_support_badge(numeric) from public;
grant execute on function public.vertex_support_badge(numeric) to authenticated;

drop view if exists public.vertex_support_summary;
create view public.vertex_support_summary with (security_invoker=true) as
with totals as (
  select user_id, count(*) as approved_count, coalesce(sum(amount), 0)::numeric as approved_total
  from public.vertex_support_payments
  where environment = 'production' and live_mode and status = 'approved' and refunded_at is null
  group by user_id
)
select user_id, approved_count, approved_total,
  public.vertex_support_badge(approved_total) as current_badge,
  case when approved_total < 5 then '💙 Supporter I' when approved_total < 25 then '⚡ Supporter II' when approved_total < 50 then '🚀 Supporter III' when approved_total < 100 then '💎 Supporter IV' when approved_total < 250 then '👑 Supporter V' else null end as next_badge,
  case when approved_total < 5 then 5 when approved_total < 25 then 25 when approved_total < 50 then 50 when approved_total < 100 then 100 when approved_total < 250 then 250 else approved_total end::numeric as next_threshold
from totals;

grant select on public.vertex_support_summary to authenticated;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vertex_support_payments'
  ) then
    alter publication supabase_realtime add table public.vertex_support_payments;
  end if;
end $$;

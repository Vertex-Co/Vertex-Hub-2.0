-- Permite que visitantes consultem somente os limites públicos dos planos.
drop policy if exists plan_limits_public_read on public.plan_limits;
create policy plan_limits_public_read on public.plan_limits for select to anon using(true);
grant select on public.plan_limits to anon;
update public.plan_limits set features=features||'{"documents":true,"tasks":true,"crm":true}'::jsonb where plan='free';

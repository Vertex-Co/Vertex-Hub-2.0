-- Vertex Hub: extensão não destrutiva do schema existente.
alter table public.user_settings drop constraint if exists user_settings_monthly_budget_check;
alter table public.user_settings add constraint user_settings_monthly_budget_check check (monthly_budget >= 0);
alter table public.user_settings alter column monthly_budget set default 0;

create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (char_length(category) between 1 and 100),
  amount numeric(14,2) not null check (amount > 0),
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, month, year)
);
create index if not exists category_budgets_user_period_idx on public.category_budgets(user_id, year, month);
alter table public.category_budgets enable row level security;
grant select, insert, update, delete on public.category_budgets to authenticated;
drop policy if exists "Users select own category budgets" on public.category_budgets;
create policy "Users select own category budgets" on public.category_budgets for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own category budgets" on public.category_budgets;
create policy "Users insert own category budgets" on public.category_budgets for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own category budgets" on public.category_budgets;
create policy "Users update own category budgets" on public.category_budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own category budgets" on public.category_budgets;
create policy "Users delete own category budgets" on public.category_budgets for delete to authenticated using ((select auth.uid()) = user_id);

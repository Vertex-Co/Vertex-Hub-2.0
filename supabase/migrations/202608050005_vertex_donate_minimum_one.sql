-- Permite apoios a partir de R$ 1 sem alterar ambiente ou status financeiro.
alter table public.vertex_support_payments
  drop constraint if exists vertex_support_payments_amount_check;

alter table public.vertex_support_payments
  add constraint vertex_support_payments_amount_check check (amount between 1 and 1000);

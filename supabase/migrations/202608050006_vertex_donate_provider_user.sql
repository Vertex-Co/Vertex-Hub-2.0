alter table public.vertex_support_payments
  add column if not exists mercado_pago_user_id text;

comment on column public.vertex_support_payments.mercado_pago_user_id is 'ID público da conta recebedora retornado pela Orders API; usado para diagnóstico de titularidade.';

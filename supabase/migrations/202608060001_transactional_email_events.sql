create table if not exists public.transactional_email_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique check (char_length(event_key) between 8 and 256),
  template text not null check (template in ('welcome','user_added_to_company','company_invitation','role_changed','reward_unlocked','system_notification')),
  user_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  recipient_masked text not null,
  provider text not null default 'resend' check (provider = 'resend'),
  provider_message_id text,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactional_email_actor_created_idx
  on public.transactional_email_events(actor_id, created_at desc);
create index if not exists transactional_email_status_idx
  on public.transactional_email_events(status, created_at desc);

alter table public.transactional_email_events enable row level security;
revoke all on public.transactional_email_events from anon, authenticated;
comment on table public.transactional_email_events is
  'Metadados server-side para idempotência, rate limit e diagnóstico. Não armazena corpo nem endereço completo.';

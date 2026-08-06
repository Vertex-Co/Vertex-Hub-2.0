alter table public.transactional_email_events
  add column if not exists test_type text
  check (test_type is null or test_type in (
    'welcome','role_changed','reward_unlocked','company_added','invitation',
    'security_alert','two_factor_enabled','admin_notification'
  ));
create index if not exists transactional_email_test_rate_idx
  on public.transactional_email_events(actor_id, created_at desc)
  where test_type is not null;

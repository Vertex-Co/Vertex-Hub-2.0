-- O cadastro Auth não deve depender de inserts em tabelas públicas.
-- Profiles continuam sendo criados pelo onboarding e pela Edge Function de membros.
drop trigger if exists on_auth_user_created_vertex on auth.users;
drop function if exists public.handle_new_auth_user();
notify pgrst,'reload schema';

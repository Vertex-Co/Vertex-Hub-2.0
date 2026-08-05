# Configuração de Segurança do Vertex Hub

## PASSO 1 — Homologação e backup

Abra `https://supabase.com/dashboard`, selecione primeiro um projeto de homologação e faça backup do banco. Não teste autenticação diretamente em produção.

## PASSO 2 — Aplicar a migration

Execute `npx supabase login`, `npx supabase link --project-ref SEU_PROJECT_REF` e `npx supabase db push`. Alternativamente, abra **SQL Editor > New query**, copie integralmente `supabase/migrations/202608050001_security_hardening_mfa.sql` e execute. Ela não apaga dados.

## PASSO 3 — Conferir RLS e policies

No Dashboard, abra **Database > Tables**. Confirme **RLS enabled** em `profiles`, `companies`, `company_members`, transações, metas, CRM, tarefas, calendário, documentos, tickets, logs e configurações. Em **Authentication > Policies**, confira policies por operação. `plan_limits` é a leitura anon intencional encontrada.

## PASSO 4 — Ativar TOTP

Abra **Authentication > Multi-Factor Authentication** (ou **Authentication > Settings > MFA**, conforme a versão). Ative **TOTP** e salve. Não habilite telefone sem revisar risco de SIM swap.

## PASSO 5 — URLs autorizadas

Abra **Authentication > URL Configuration**. Defina **Site URL** para a URL HTTPS final. Em **Redirect URLs**, inclua produção, previews realmente usados e `http://localhost:5173` somente em desenvolvimento. Remova curingas amplos em produção.

## PASSO 6 — Rate limits e abuso

Abra **Authentication > Rate Limits**. Revise limites de login, signup, recuperação, envio de e-mail e OTP/MFA disponíveis no plano. Comece com os defaults recomendados pela Supabase, monitore falsos positivos e restrinja OTP se houver abuso. Ative CAPTCHA se login/signup forem públicos. Os valores variam por plano e devem ser confirmados no painel.

## PASSO 7 — Variáveis na Vercel

Em `https://vercel.com`, abra **Project > Settings > Environment Variables**. Cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em Production/Preview. Elas são públicas. Nunca crie `VITE_SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_*SERVICE*` ou `PUBLIC_*SERVICE*`. Faça novo deploy.

## PASSO 8 — Secrets e deploy da Edge Function

No Supabase, abra **Edge Functions > Secrets**. Confirme `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` somente na função. Publique com `npx supabase functions deploy user-admin`. Nunca copie Service Role para o Vite.

## PASSO 9 — Primeiro Super Admin

Crie e confirme o usuário normalmente. Em **Authentication > Users**, copie o UUID exato. No SQL Editor execute `update public.profiles set global_role='super_admin', status='active' where user_id='UUID_EXATO';`. Não crie uma RPC pública de promoção.

## PASSO 10 — Testar TOTP/AAL2

Entre como Super Admin. Deve aparecer **Proteja sua conta**, QR e chave manual. Leia com Google/Microsoft Authenticator, Authy, 1Password ou Bitwarden e confirme. Saia e entre novamente: deve aparecer **Verificação em duas etapas**. Antes do código, recursos globais devem ser negados; após o código, permitidos.

## PASSO 11 — Testes ofensivos em staging

Crie usuários A/B em empresas A/B. Com anon key sem Authorization, consulte tabelas privadas e espere vazio/401/403. Com JWT de funcionário, tente INSERT/UPDATE/DELETE e altere UUID, `user_id`, `company_id`, `global_role` e membership: espere negação. Teste Super Admin AAL1 versus AAL2. Rode `npm run test:security`, `npm run test:permissions`, `npm run test:onboarding` e `npm run build`.

## PASSO 12 — Perda do autenticador

Não desative MFA por pedido de e-mail simples. Valide identidade por processo administrativo forte, registre ticket e use **Authentication > Users > usuário > MFA factors** somente após validação. Revogue as sessões. O Super Admin ficará sem acesso global até cadastrar e confirmar novo TOTP.

## PASSO 13 — Senha, e-mail e passkeys

Mantenha confirmação de e-mail habilitada. Para troca de e-mail/senha, passkeys e MFA, exija sessão recente e AAL2 para Super Admin. Em **Authentication > Sessions**, defina duração compatível com o risco. Revogue sessões após recuperação. Nunca registre senha, código/secret TOTP, access token ou refresh token.

## PASSO 14 — Logs e revisão contínua

Revise **Logs > Auth** e `activity_logs`: falhas repetidas, MFA, roles, usuários e ações globais. Configure alertas externos se disponíveis. Após qualquer alteração de policy, repita os testes A/B antes do deploy.

# Gestão de usuários, termos e planos

## Fluxos de conta

Cadastro normal: o usuário aceita os Termos 1.0, cria a conta, conclui o onboarding, cria sua empresa e recebe `company_owner`. O aceite é transportado em metadata do signup e persistido pelo trigger `handle_new_auth_user`.

Funcionário: Owner/Admin preenche nome, e-mail, senha inicial, cargo e role. A Edge Function `user-admin` valida o JWT, a empresa, a autorização e o limite do plano; usa Admin API somente no servidor; cria Auth, profile e membership. Se banco/membership falhar, remove o Auth criado como compensação. A senha não é salva ou retornada.

No primeiro login, um funcionário com membership não abre onboarding empresarial. Ele aceita os Termos pessoalmente e troca a senha inicial; então acessa diretamente a empresa. Google, e-mail/senha e Passkeys continuam usando o mesmo fluxo de sessão.

## Roles

- Plataforma: `super_admin` ou `user`.
- Empresa: `company_owner` (Dono), `admin` ou `employee`.

Owner/Admin gerenciam somente a própria empresa. Somente Super Admin pode promover para Owner ou alterar um Owner. A RPC impede deixar uma empresa sem Owner e audita mudanças.

## Listagem global

O contador do dashboard consulta profiles. A listagem anterior dependia de profiles e relacionamentos PostgREST completos, por isso contas apenas em `auth.users` podiam faltar. A migration faz backfill sem sobrescrever profiles; a listagem global agora chama a Edge Function, que verifica `super_admin` e cruza Auth, profiles e memberships.

## Edge Function

Arquivo: `supabase/functions/user-admin/index.ts`. Publique com Supabase CLI:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy user-admin
```

O Supabase fornece `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` dentro da função. Nunca coloque service role em Vercel, `VITE_*` ou frontend.

## Termos

`terms_acceptances` registra usuário, tipo, versão, empresa e horário. Cadastro normal exige checkbox. Funcionários aceitam no primeiro login. `commercial_interests` registra apenas manifestação de interesse, plano, duração, preço exibido, desconto e versão; nunca pagamento.

## Planos e cálculos

`plan_settings` é a fonte central editável pelo Super Admin. Valores iniciais: Start 50, Growth 100, Prime 150; descontos de 5% para 3 e 12 meses; Vitalício 10% sobre `lifetime_base_price`. Sem base vitalícia, aparece “Valor sob consulta”. Enterprise nunca calcula valor.

Fórmula: `subtotal = mensalidade × meses`; `economia = subtotal × percentual / 100`; `total = subtotal - economia`. Assim: Start 3m = 142,50; Start 12m = 570; Growth 3m = 285; Growth 12m = 1.140; Prime 3m = 427,50; Prime 12m = 1.710.

Após escolher período e aceitar os Termos de Contratação, a aplicação registra `commercial_interest` e abre o WhatsApp `+55 61 99397-2886` com plano, duração e preço. Não há pagamento ou renovação automática.

## Limites

Owner conta no limite. A Edge Function verifica antes da criação e o trigger no banco é a segunda camada. Usuários existentes nunca são apagados quando o limite é alcançado.

## Migration e RLS

Depois das migrations anteriores, execute `202608010004_user_management_terms_plans.sql`. Ela cria/backfill profiles, terms_acceptances, commercial_interests e plan_settings; cria trigger Auth, RPCs e policies. RLS permite ao usuário seus aceites/interesses, aos admins sua empresa e ao Super Admin a visão global.

## Testes

Teste com três contas reais: Super Admin, Owner e Funcionário. Valide listagem Auth, criação/duplicidade/limite, primeiro login, aceite, troca de senha, refresh, isolamento entre empresas, mudança de roles, cálculos, checkbox comercial e mensagem WhatsApp. Cerimônias Google/Passkey exigem teste interativo no ambiente configurado.

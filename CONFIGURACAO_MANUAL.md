# Configuração manual — Vertex Hub 2.0

Use um projeto isolado de homologação; não aponte esta cópia para produção.

## 1. Instalação local

Instale Node.js 22 LTS. No terminal execute `npm install`, copie `.env.example` para `.env.local`, preencha as variáveis e rode `npm run dev`. Valide produção com `npm run build` e `npm run preview`.

## 2. Criar o Supabase de teste

Em https://supabase.com/dashboard clique **New project**, escolha organização, nome de homologação, região e uma senha forte do banco. Guarde a senha e aguarde a criação.

## 3. Credenciais e ambiente

Abra **Project Settings > API**. Copie Project URL e Publishable key (ou `anon` em projetos antigos):

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

O `.gitignore` bloqueia `.env.local`. Nunca use `service_role` no navegador, GitHub ou Vercel.

## 4. Migrations

Em **SQL Editor > New query**, execute integralmente e nesta ordem:

1. `202607300001_fintrack_schema.sql`: tabelas financeiras base.
2. `202607300002_vertex_hub_improvements.sql`: orçamentos por categoria.
3. `202608010001_vertex_hub_multitenant.sql`: perfis, empresas, vínculos, logs, `company_id`, RPC e RLS.

Confirme **Success** em cada execução. Em **Database > Tables**, confira **RLS enabled** em `profiles`, `companies`, `company_members`, `company_settings`, `transactions`, `goals`, `category_budgets` e `activity_logs`.

## 5. Primeira conta e super_admin

Crie a conta pela aplicação e conclua o onboarding. Em **Authentication > Users**, copie o UUID. Em **Table Editor > profiles**, ache o mesmo `user_id`, altere `global_role` para `super_admin` e salve. Saia e entre: **GESTÃO VERTEX > Empresas** aparecerá.

## 6. Google OAuth

No Google Cloud Console crie/selecione projeto, abra **Google Auth Platform**, configure Branding/Audience e crie um OAuth Client ID do tipo **Web application**. No Supabase, abra **Authentication > Providers > Google** e copie o callback exibido, normalmente `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Cadastre-o em **Authorized redirect URIs** no Google. Coloque Client ID/Secret no provedor Google do Supabase e ative. O segredo fica somente no Supabase.

## 7. URLs de autenticação

Em **Authentication > URL Configuration**, defina Site URL e adicione Redirect URLs: `http://localhost:5173/**`, `https://seu-teste.vercel.app/**` e futuramente a produção. Isso atende OAuth, confirmação e recuperação. Em **Providers > Email**, decida se confirmação será obrigatória e teste a mensagem.

## 8. Vercel

Crie **Add New > Project**, conecte somente o repositório de homologação, selecione Vite, build `npm run build` e saída `dist`. Adicione as duas variáveis públicas em **Settings > Environment Variables**, faça o deploy manual e inclua a URL gerada nas Redirect URLs do Supabase.

Nunca exponha `service_role`, senha do banco, Client Secret do Google, tokens pessoais ou segredos administrativos.

## Passkeys

Para habilitar Windows Hello, Face ID, Touch ID, PIN e chaves WebAuthn, siga `docs/PASSKEYS_SETUP.md`. Defina o RP ID definitivo antes que usuários cadastrem chaves.

## 9. Checklist

- [ ] Cadastro, confirmação, login, recuperação e logout funcionam
- [ ] Sessão persiste após refresh
- [ ] Google novo abre onboarding; existente abre dashboard
- [ ] CPF/CNPJ inválidos são recusados e telefone recebe máscara
- [ ] Profile, empresa e vínculo owner são criados atomicamente
- [ ] Usuário comum não vê Empresas; admin vê e troca contexto
- [ ] Transação do admin registra empresa e ator corretos
- [ ] Empresa A não lê nem altera empresa B
- [ ] Todos os módulos respeitam a empresa ativa
- [ ] Build passa e nenhum segredo foi commitado

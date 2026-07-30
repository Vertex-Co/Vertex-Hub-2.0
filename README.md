# Vertex Hub

**Central de Gestão Digital**

Aplicação financeira em React, TypeScript e Supabase para receitas, despesas, metas, orçamentos, relatórios, pesquisa, notificações e privacidade de valores.

## Configuração

```bash
npm install
copy .env.example .env.local
npm run dev
```

Preencha apenas as chaves públicas:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Execute em ordem as migrations de `supabase/migrations` no SQL Editor. Elas criam tabelas, índices e políticas RLS que isolam dados por `auth.uid()`. Nunca use `service_role` no frontend.

## Google OAuth

Siga [GOOGLE_AUTH_SETUP.md](./GOOGLE_AUTH_SETUP.md). Client ID e Client Secret pertencem ao painel do Supabase; nenhum segredo do Google deve ficar em `.env` do Vite.

## Build e publicação

```bash
npm run build
npm run preview
```

Na Vercel, configure as duas variáveis públicas, build `npm run build` e saída `dist`. A aplicação usa navegação interna sem URLs de rota, e o OAuth usa a origem atual.

## Estrutura

- `src/components`: autenticação, layout, pesquisa, notificações e modais
- `src/contexts`: sessão e dados financeiros
- `src/hooks`: comparações, notificações e privacidade
- `src/pages`: áreas do produto
- `src/utils`: datas, cálculos e formatação protegida
- `supabase/migrations`: schema e RLS

## Funcionalidades

- Login, cadastro, recuperação de senha e Google OAuth
- Transações com filtros, paginação e CSV
- Dashboard por período e gráficos diário, semanal e mensal
- Metas, orçamento geral, alertas financeiros e relatórios
- Pesquisa global, central de notificações e ocultação persistente de valores
- Tema claro/escuro, PWA básica, Política de Privacidade e Termos

Desenvolvido pela Vertex, por André Gomes, com apoio do Codex.

© 2026 Vertex. Todos os direitos reservados.

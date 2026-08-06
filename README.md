# Vertex Hub

**Central de Gestão Digital**

Aplicação financeira em React, TypeScript e Supabase para receitas, despesas,
metas, orçamentos, relatórios, pesquisa, notificações e privacidade de valores.

## Configuração

```bash
npm install
copy .env.example .env.local
npm run dev
```

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Execute as
migrations de `supabase/migrations` em ordem. Nunca use `service_role` no frontend.

## Apoio por Pix

O sistema de apoio utiliza um QR Code Pix estático. O valor da contribuição é
definido pelo usuário diretamente em seu aplicativo bancário. O sistema não
realiza confirmação automática do pagamento e não usa API bancária.

O payload fica centralizado em `src/config/donation.ts`. Para substituir o Pix
no futuro, altere somente `DONATION_PIX.code` e valide o novo QR Code.

## Verificação e build

```bash
npm run typecheck
npm run test:donation
npm run build
```

Siga `GOOGLE_AUTH_SETUP.md` para configurar o login Google. Na Vercel, use
`npm run build` e publique o diretório `dist`.

Desenvolvido pela Vertex, por André Gomes, com apoio do Codex.

© 2026 Vertex. Todos os direitos reservados.

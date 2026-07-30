# Dashboard Financeiro — FinTrack

Dashboard financeiro completo em React + TypeScript, com persistência local, gráficos, gestão de transações, metas, orçamento e relatórios.

## Supabase

Copie `.env.example` para `.env.local` e informe:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

Execute `supabase/migrations/202607300001_fintrack_schema.sql` no SQL Editor do projeto antes do primeiro acesso. A migração cria as tabelas e ativa Row Level Security, garantindo que cada usuário acesse somente os próprios dados.

## Executar localmente

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente `http://localhost:5173`).

## Build de produção

```bash
npm run build
npm run preview
```

## Funcionalidades

- Cadastro, edição, duplicação e exclusão de transações
- Filtros, busca, ordenação, paginação e exportação CSV
- Cards e gráficos atualizados em tempo real
- Orçamento mensal editável com indicadores de limite
- Metas financeiras com aportes e progresso
- Relatórios mensais e impressão
- Tema claro/escuro e layout responsivo
- Validação com React Hook Form + Zod
- Cadastro, login, recuperação de senha e sessão persistente com Supabase Auth
- Persistência em PostgreSQL com dados de demonstração por conta
- Isolamento de dados por usuário usando Row Level Security

Somente a preferência de tema fica no navegador. Transações, metas, orçamento e perfil são sincronizados com o Supabase.

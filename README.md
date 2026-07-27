# Dashboard Financeiro — FinTrack

Dashboard financeiro completo em React + TypeScript, com persistência local, gráficos, gestão de transações, metas, orçamento e relatórios.

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
- Persistência em LocalStorage com dados de demonstração na primeira execução

Os dados ficam somente no navegador. A separação entre contexto, armazenamento, tipos, páginas e componentes deixa o projeto preparado para substituir o LocalStorage por uma API.

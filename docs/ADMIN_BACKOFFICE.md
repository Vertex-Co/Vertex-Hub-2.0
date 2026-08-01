# Backoffice administrativo Vertex Hub

## Arquitetura e segurança

`super_admin` é o único papel global com acesso a todas as empresas e configurações da plataforma. Administradores empresariais são vínculos em `company_members.role = company_owner|admin` e permanecem limitados à própria empresa por RLS. Digitar uma página administrativa ou manipular requests não amplia acesso.

Operações críticas de plano, status empresarial e role usam RPCs `security definer` que repetem a autorização e gravam auditoria. O frontend apenas apresenta controles. O último Super Admin não pode ser removido pela interface porque nenhuma operação pública altera `global_role`.

## Planos

- Free: gratuito e utilizável, até 3 usuários.
- Start: R$ 50/mês, até 3 usuários.
- Growth: R$ 100/mês, até 10 usuários.
- Prime: R$ 150/mês, até 30 usuários.
- Enterprise: limites personalizados.

Novas empresas recebem `free`. O trigger `enforce_company_member_limit` impede somente novos vínculos acima do limite; não remove nem bloqueia usuários existentes. Não existe checkout ou pagamento. Os botões abrem WhatsApp `+55 61 99397-2886` com mensagem específica.

## Módulos

- Visão geral: números reais de empresas, usuários, suspensões, planos e logs.
- Empresas: busca, filtros, plano, suspensão/reativação e modo de visualização administrativa.
- Usuários: busca, filtros e alteração de role empresarial.
- Recursos: feature flags globais sem flags de IA.
- Conteúdo: CMS por chaves predefinidas, apenas texto; não aceita scripts/HTML/SQL.
- Notificações: comunicações globais tipadas.
- Suporte: tickets isolados por empresa; Super Admin vê todos.
- Auditoria: ações críticas, valores anterior/novo e data.
- Segurança e Sistema: apenas dados verificáveis.

## Migration

Execute depois das migrations anteriores:

```text
supabase/migrations/202608010003_saas_backoffice.sql
```

Ela altera `companies`, `profiles`, `company_members` e `activity_logs`; cria `feature_flags`, `site_content`, `platform_notifications`, `support_tickets` e `global_settings`; adiciona índices, funções, triggers e policies.

## Teste recomendado

1. Criar empresa nova e verificar plano Free.
2. Testar logins e módulos financeiros existentes.
3. Com Super Admin, abrir todas as áreas do backoffice.
4. Com admin empresarial, confirmar que somente sua empresa/usuários aparecem.
5. Com usuário comum, confirmar ausência das áreas administrativas.
6. Alterar plano/status/role e conferir `activity_logs`.
7. Suspender empresa e confirmar que dados permanecem, mas writes financeiros falham.
8. Atingir limite de membros e confirmar `company_user_limit_reached`.
9. Editar CMS, flag e notificação; testar acesso negado com usuário comum.
10. Criar tickets em duas empresas e validar isolamento.

## Limitações desta versão

- Não existe convite de novos membros; o limite já protege o banco para quando esse fluxo for criado.
- Suspensão de usuários e alteração de `global_role` continuam manuais no Supabase para reduzir risco de lockout.
- Dados de último login/método de autenticação dependem de integração server-side com `auth.users`; não são inventados no frontend.
- CMS persiste conteúdo, mas as telas públicas existentes ainda precisam consumir todas as chaves dinamicamente.
- Enterprise é armazenado e auditável; a interface inicial troca o plano, enquanto limites avançados podem ser preenchidos no Table Editor.
- Não há métricas de uptime, observabilidade ou sessões porque o projeto não possui infraestrutura confiável para isso.

Nenhum pagamento e nenhuma funcionalidade de IA foram implementados.

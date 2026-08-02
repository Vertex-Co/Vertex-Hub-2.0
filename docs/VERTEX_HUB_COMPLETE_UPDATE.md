# Atualização completa do Vertex Hub

## Aplicação no Supabase

Execute, na ordem, as migrations que ainda não constam no histórico do projeto. No SQL Editor, cole o **conteúdo** do arquivo, nunca o caminho. A migration desta entrega é:

`supabase/migrations/202608020001_vertex_hub_complete_foundation.sql`

Ela é incremental: não remove empresas, usuários, transações, planos, termos ou autenticação existentes.

## Chaves de ativação

Somente o Super Admin acessa **Chaves de Ativação**. O navegador usa aleatoriedade criptográfica e exibe a chave integral uma única vez. O banco armazena somente SHA-256 e um prefixo de identificação. Criação, revogação e ativação são RPCs `security definer` com validação de role. A ativação bloqueia a linha com `FOR UPDATE`, impedindo uso simultâneo, atualiza plano e validade na mesma transação e grava auditoria sem a chave completa.

O owner ativa em **Planos**. Chaves comuns são de uso único; chaves vinculadas só funcionam na empresa definida; vitalício usa `plan_expires_at = null`.

## Planos e limites

`plan_limits` centraliza usuários, armazenamento, arquivo máximo, unidades, retenção e recursos. Defaults: Free 1 usuário/250 MB/10 MB; Start 3/2 GB/25 MB; Growth 10/10 GB/50 MB; Prime 30/30 GB/100 MB; Enterprise configurável.

## Operação e documentos

Foram adicionadas estruturas multiempresa para unidades, tarefas, CRM, histórico de clientes, pastas, arquivos, calendário, notificações, notas e campos personalizados. Documentos usam o bucket privado `company-documents`; o primeiro segmento do path deve ser o UUID da empresa. Tipos permitidos são PDF, imagens, DOCX, XLSX e CSV. Metadados e exclusão lógica ficam em `company_files`.

O frontend possui páginas responsivas para Tarefas, CRM, Documentos e Calendário, com loading, vazio e erro distintos. Upload binário ainda deve ser concluído por uma Edge Function que reserve quota de forma transacional antes de enviar ao Storage; a interface não simula que esse controle já existe.

## Segurança e RLS

Todas as entidades operacionais possuem `company_id`, índices por consultas frequentes e RLS baseada em `is_company_member`, `company_is_active` e `is_super_admin`. Alterar `companies.plan` diretamente pelo frontend não foi habilitado. Não são auditados senhas, tokens nem chaves integrais.

## Estado desta etapa

Entregues nesta etapa: fundação de planos/entitlements, chaves, auditoria, entidades de documentos e operação, RLS, índices e navegação. Próximas extensões recomendadas: Edge Function de upload com reserva de quota, Kanban completo, recorrências financeiras, MFA/TOTP, exportação XLSX/PDF, busca global agregada, telas de CMS/FAQ avançadas e job agendado de expiração de planos.

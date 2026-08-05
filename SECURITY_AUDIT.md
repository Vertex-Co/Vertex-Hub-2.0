# Auditoria de Segurança Vertex Hub

## Vulnerabilidade — Super Admin sem MFA server-side

## Situação anterior

Role ativa bastava nas policies e Edge Function; a navegação era ocultada no frontend, mas AAL2 não era exigido.

## Risco

Uma sessão AAL1 comprometida poderia operar recursos globais.

## Correção aplicada

`is_super_admin()` e a Edge Function agora exigem role ativa mais claim `aal2`. Foi implementado TOTP oficial com enrollment, challenge e verify.

## Arquivos modificados

Migration `202608050001`, `user-admin/index.ts`, `MfaGate.tsx` e `App.tsx`.

## Status

CORRIGIDO

## Vulnerabilidade — Autopromoção/campos protegidos

## Situação anterior

A policy de UPDATE do perfil próprio não distinguia colunas pessoais das colunas de autoridade.

## Risco

PATCH manual poderia tentar alterar role, autorização, empresa autorizada ou onboarding.

## Correção aplicada

Trigger rejeita mudanças desses campos pelo próprio usuário. INSERT/UPDATE/DELETE direto em `company_members` foi revogado; roles passam pela RPC autorizada.

## Status

CORRIGIDO

## Vulnerabilidade — Helpers aceitavam UID do cliente

## Situação anterior

Helpers `SECURITY DEFINER` tinham parâmetro `uid` opcional.

## Risco

Enumeração de privilégios e uso inseguro futuro.

## Correção aplicada

Novas assinaturas derivam identidade de `auth.uid()` e a execução das antigas foi revogada.

## Status

CORRIGIDO

## Vulnerabilidade — Exposição excessiva

## Situação anterior

A listagem global usava `profiles.select('*')` e devolvia telefone/metadados desnecessários.

## Correção aplicada

Campos explícitos e resposta reduzida.

## Status

CORRIGIDO

## Verificação — IDOR, multiempresa, anon, secrets e storage local

As migrations finais já condicionavam dados de tenant a membership; a migration de funcionário já separava leitura/escrita. Não foi encontrada Service Role em Vite/HTML/env público. `sessionStorage` contém somente empresa selecionada e `localStorage`, preferências visuais; nenhum deles é fonte de autoridade. A leitura anon intencional encontrada é `plan_limits`.

## Status

NÃO SE APLICA / CONTROLES PRESERVADOS E ENDURECIDOS

## Vulnerabilidade — Rate limits e recuperação operacional

Configurações do provedor não vivem no repositório.

## Correção aplicada

Instruções exatas estão em `SECURITY_SETUP.md`.

## Status

AÇÃO MANUAL NECESSÁRIA

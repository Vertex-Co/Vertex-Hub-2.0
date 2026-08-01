# Passkeys / WebAuthn — configuração e testes

## O que foi implementado

O Vertex Hub oferece login sem e-mail prévio por Passkey e gerenciamento autenticado para listar, cadastrar, renomear e remover chaves. E-mail/senha, Google OAuth, onboarding, empresa ativa e RLS continuam independentes e disponíveis.

O navegador e o Supabase executam a cerimônia WebAuthn. O Vertex não recebe nem armazena biometria, PIN, chave privada, credential, challenge ou segredo.

## Arquivos

- `src/services/supabase.ts`: opt-in experimental.
- `src/services/passkeys.ts`: API oficial e mensagens amigáveis.
- `src/hooks/usePasskeys.ts`: estado, carregamento e atualização da lista.
- `src/components/auth/PasskeyManager.tsx`: cadastro e gerenciamento.
- `src/pages/Auth.tsx`: botão de login.
- `src/pages/Settings.tsx`: seção Chaves de acesso.
- `src/contexts/AuthContext.tsx`: integração ao fluxo de sessão existente.

Dependência atualizada: `@supabase/supabase-js` de 2.57.4 para 2.105.3. Nenhuma outra dependência foi atualizada intencionalmente.

## CONFIGURAÇÃO MANUAL NO SUPABASE

Abra **Authentication → Passkeys** e configure:

1. **Enable Passkey authentication**: ativado.
2. **Relying Party Display Name**: `Vertex Hub`.
3. **Relying Party ID**: `[CONFIGURAR MANUALMENTE]`. Use somente o hostname estável do domínio final, sem `https://`, caminho ou barra. Exemplo estrutural: para `https://app.dominio.com`, o RP ID pode ser `app.dominio.com` ou o domínio pai permitido conforme sua estratégia.
4. **Relying Party Origins**: `[CONFIGURAR MANUALMENTE]`. Informe cada origem completa autorizada, com protocolo e sem caminho, como a URL exata de produção Vercel/domínio próprio. Para desenvolvimento, inclua `http://localhost:5173` se o painel permitir múltiplas origens.

> **Atenção:** alterar o RP ID depois que usuários cadastrarem Passkeys torna as chaves antigas inutilizáveis. Defina o domínio definitivo antes da adoção real.

WebAuthn exige HTTPS em produção; `localhost` é a exceção de desenvolvimento. Preview URLs variáveis da Vercel não são uma base adequada para credenciais permanentes. Não há RP ID hardcoded no código.

## Como usar

Para cadastrar: entre normalmente, conclua o onboarding e abra **Configurações → Chaves de acesso → Adicionar chave**. Confirme no Windows Hello, Face ID, Touch ID, gerenciador de senhas ou chave física. Depois é possível renomear (1–120 caracteres) ou remover.

Para entrar: saia da conta, escolha **Entrar com chave de acesso** e selecione a credencial no autenticador. O evento `SIGNED_IN` alimenta o mesmo fluxo de sessão usado pelos outros métodos.

## Testes

Localmente, configure `.env.local`, execute `npm run dev` e use `http://localhost:5173`. Em produção, use HTTPS e uma origem cadastrada. Teste: login e-mail e Google; cadastro/listagem/renomeação/remoção; logout e login com Passkey; cancelamento; refresh; navegador sem WebAuthn; e acesso à empresa sob as mesmas policies RLS.

## Limitações e riscos

- O recurso do Supabase e a API do SDK são experimentais e podem mudar.
- Usuários anônimos, não confirmados e autenticados por SSO não podem registrar Passkeys.
- Google OAuth não é SSO empresarial nessa verificação e pode registrar Passkey se a conta estiver confirmada.
- Uma Passkey pertence ao usuário, não à empresa, papel ou plano.
- Perder todos os autenticadores exige usar e-mail/senha ou Google como recuperação.

# Configuração do Resend no Vertex Hub

O Vertex Hub usa o Resend somente para e-mails transacionais. O navegador não
recebe a chave da API. Login, confirmação e recuperação de senha continuam no
Supabase Auth.

## 1. Criar a conta e verificar o domínio

1. Abra [resend.com](https://resend.com) e crie ou acesse sua conta.
2. No painel, abra **Domains** e clique em **Add Domain**.
3. Informe `vertexdf.com.br` e confirme.
4. O Resend exibirá os registros DNS necessários. Copie nome, tipo, valor,
   prioridade e TTL exatamente como apresentados no painel.
5. Abra o painel do provedor DNS responsável por `vertexdf.com.br` e crie cada
   registro. Não use valores copiados de tutoriais: utilize exatamente os
   registros apresentados pelo Resend no painel.
6. Volte ao Resend e inicie/verifique a validação. Aguarde a propagação DNS.

SPF informa quais servidores podem enviar em nome do domínio. DKIM adiciona uma
assinatura verificável às mensagens. Ambos ajudam os destinatários a distinguir
e-mails legítimos. O painel pode apresentar também MX e outros registros; copie
todos os registros exigidos, sem alterar valores.

Em testes, o Resend permite remetente/destinatários limitados na conta de teste.
Para enviar como `noreply@vertexdf.com.br` a destinatários reais, o domínio deve
estar com status **Verified**. Depois de verificado, é possível usar um endereço
do domínio como remetente sem criar uma caixa postal separada.

## 2. Criar a API Key

1. No Resend, abra **API Keys**.
2. Clique em **Create API Key** e dê um nome identificável, como `Vertex Hub Production`.
3. Restrinja a permissão ao envio quando essa opção estiver disponível.
4. Copie a chave imediatamente; ela é exibida uma única vez.
5. Não coloque a chave em arquivos versionados, prints, tickets ou variáveis `VITE_*`.

## 3. Configurar o backend Supabase

O backend atual é uma Supabase Edge Function. Portanto, estes valores precisam
estar em **Supabase Dashboard > Project Settings > Edge Functions > Secrets**:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=noreply@vertexdf.com.br
RESEND_FROM_NAME=Vertex Hub
RESEND_TEMPLATE_ID=
APP_URL=https://vertex-hub-2-0.vercel.app
```

Também é possível configurar com a CLI:

```bash
supabase secrets set RESEND_API_KEY=... RESEND_FROM_EMAIL=noreply@vertexdf.com.br RESEND_FROM_NAME="Vertex Hub" RESEND_TEMPLATE_ID=... APP_URL=https://vertex-hub-2-0.vercel.app
supabase functions deploy user-admin
```

Execute a migration `supabase/migrations/202608060001_transactional_email_events.sql`
antes de publicar a função.

## 4. Configurar a Vercel

1. Abra [vercel.com](https://vercel.com) e selecione o projeto Vertex Hub.
2. Acesse **Settings > Environment Variables**.
3. Adicione `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `RESEND_TEMPLATE_ID` e `APP_URL`.
4. Selecione os ambientes necessários (Preview e/ou Production) e salve.
5. Faça **Redeploy** para aplicar as alterações.

Importante: o frontend Vite não consome essas variáveis sem o prefixo `VITE_`,
o que evita incluí-las no bundle. Na arquitetura atual, quem envia e-mail é a
Edge Function Supabase; por isso, configurar os mesmos secrets no Supabase é
obrigatório. A configuração da Vercel deixa o projeto preparado para um futuro
backend Vercel, mas sozinha não configura a Edge Function.

## Template único para testes administrativos

No painel Resend, crie ou reutilize um único template publicado. Configure o
assunto como `{{TITULO}} | Vertex Hub` e utilize estas variáveis no conteúdo:

`NOME`, `TITULO`, `MENSAGEM`, `CARD_LABEL`, `CARD_VALUE`, `BUTTON_TEXT`,
`BUTTON_URL` e `ANO`.

Copie o ID do template publicado para `RESEND_TEMPLATE_ID`. Os oito tipos de
teste do painel usam esse mesmo ID; apenas as variáveis mudam. Não crie um
template por tipo. Ao trocar o domínio definitivo, altere somente `APP_URL`.

## 5. Testar

Para um teste local controlado, crie `.env.local` (ignorado pelo Git) com as
variáveis e execute:

```bash
npm run email:test -- seu-email@dominio.com
```

O destinatário é obrigatório e validado. O script não imprime a API Key. Depois:

1. Confirme a mensagem na caixa de entrada e no Spam.
2. Abra **Emails** no Resend e confira o evento e eventuais erros.
3. Cadastre um usuário de teste pelo Vertex Hub e confirme o e-mail de inclusão.
4. Altere seu cargo e confirme a notificação.
5. Crie uma conta comum e confirme o e-mail de boas-vindas após o primeiro login.
6. Consulte `transactional_email_events` no Supabase para conferir `sent` ou `failed`.

## 6. Diagnóstico e rotação

Se o domínio não verificar, compare cada registro com o painel, confira se o
provedor acrescentou o domínio duas vezes e aguarde a propagação, que pode levar
até 72 horas. Use **Restart verification** quando disponível.

Para revogar uma chave, abra **API Keys**, selecione a chave comprometida e
revogue/exclua. Crie outra chave, atualize os secrets do Supabase e da Vercel,
publique novamente a função e só então confirme o envio de teste.

## Checklist final

- [ ] Domínio `vertexdf.com.br` verificado no Resend
- [ ] SPF, DKIM e demais registros exatamente iguais aos exibidos no painel
- [ ] API Key com o menor privilégio necessário
- [ ] Cinco secrets configurados no Supabase, incluindo `RESEND_TEMPLATE_ID`
- [ ] Variáveis configuradas na Vercel, sem prefixo público
- [ ] Migration executada
- [ ] `user-admin` publicada
- [ ] Teste manual recebido e visível no painel do Resend
- [ ] API Key ausente do bundle e do repositório

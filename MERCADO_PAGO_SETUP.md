# Vertex Donate — Mercado Pago

Integração exclusiva da aplicação **Vertex Donate** (`Application ID 6192988275087581`), usando Checkout Transparente e API Orders. Nunca coloque credenciais no Git, no navegador ou neste documento.

## 1. Variáveis

Na Vercel, em **Project > Settings > Environment Variables**, configure a Public Key da mesma aplicação:

```text
VITE_MERCADO_PAGO_PUBLIC_KEY=<PUBLIC_KEY>
```

No Supabase `dsklsyftdpjwdbfxbqsp`, salve os secrets server-side:

```powershell
npx.cmd supabase secrets set "MERCADO_PAGO_ACCESS_TOKEN=<ACCESS_TOKEN>" "MERCADO_PAGO_WEBHOOK_SECRET=<WEBHOOK_SECRET>" "MERCADO_PAGO_MODE=test" --project-ref dsklsyftdpjwdbfxbqsp
```

O limite máximo padrão é R$ 1.000. Opcionalmente configure `MERCADO_PAGO_MAX_AMOUNT` nos secrets. Nunca use `VITE_MERCADO_PAGO_ACCESS_TOKEN`.

## 2. Banco e deploy

No **Supabase Dashboard > SQL Editor**, execute integralmente `supabase/migrations/202608050004_vertex_donate_clean.sql`. A migration cria `vertex_support_payments`, RLS, índices e o resumo de recompensas. A tabela antiga não é apagada e não participa do novo fluxo.

```powershell
npx.cmd supabase functions deploy mercado-pago-create-order --project-ref dsklsyftdpjwdbfxbqsp
npx.cmd supabase functions deploy mercado-pago-webhook --no-verify-jwt --project-ref dsklsyftdpjwdbfxbqsp
```

`mercado-pago-create-order` exige JWT Supabase. O webhook não exige JWT porque valida a assinatura HMAC oficial.

## 3. Webhook

No painel Mercado Pago, abra **Suas integrações > Vertex Donate > Webhooks**, selecione eventos de **Order** e use:

```text
https://dsklsyftdpjwdbfxbqsp.supabase.co/functions/v1/mercado-pago-webhook
```

Copie a assinatura secreta para `MERCADO_PAGO_WEBHOOK_SECRET`. O simulador deve obter HTTP 200 para assinatura válida; assinatura inválida retorna 401. A função consulta `GET /v1/orders/{id}` e confere Order ID, referência, valor, BRL, ambiente e Application ID antes de atualizar o banco.

## 4. Testes Pix e cartão

1. Confirme `MERCADO_PAGO_MODE=test` e o aviso **MODO TESTE** no Hub.
2. Entre com um usuário Vertex e abra **Apoie a Vertex**.
3. Pix: escolha R$ 5, selecione Pix e use somente o cenário sandbox oficial. O QR Code e o Copia e Cola devem vir da resposta da API.
4. Cartão: use exclusivamente cartões e titulares oficiais de teste. O Payment Brick tokeniza os dados; o Vertex não recebe nem armazena número completo ou CVV.
5. Para 3DS, siga o challenge exibido pelo componente oficial. Não simule challenge manualmente.

Se a API responder `invalid_credentials`, confira no painel da própria aplicação qual conjunto de credenciais a API Orders exige para sandbox. Não troque para cobrança real. O sistema bloqueia Application ID diferente e incompatibilidade entre `MERCADO_PAGO_MODE` e `live_mode`.

## 5. Order ID, Application ID e qualidade

Dono ou Super Admin abre **Apoie a Vertex > Integrações → Mercado Pago**. Cada registro mostra Order ID, `external_reference`, valor, status, método, ambiente e Application ID. Use **Copiar Order ID** para obter o identificador `ORD...` exigido na medição de qualidade.

A integração só está corretamente vinculada quando uma Order nova retorna:

```text
integration_data.application_id = 6192988275087581
processing_mode = automatic
```

Qualquer outro ID gera `APPLICATION_MISMATCH` e nunca concede recompensa.

## 6. Produção futura

Produção está fora do escopo inicial. Antes de habilitá-la, valide webhook, reembolso, idempotência e reconciliação; configure credenciais da mesma aplicação; altere `MERCADO_PAGO_MODE=production`; redeploye frontend/funções e execute uma revisão de segurança. Somente pagamentos `production`, `live_mode=true`, aprovados e não reembolsados contam para Supporter I–V. Early Supporter permanece desativado.

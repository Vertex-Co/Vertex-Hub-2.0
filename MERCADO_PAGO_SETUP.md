# Mercado Pago — configuração do apoio voluntário

Esta versão é exclusivamente de teste. Não use credenciais produtivas.

## 1. Credenciais de teste

Abra `https://www.mercadopago.com.br/developers/panel/app`, selecione a aplicação Checkout Transparente e abra **Credenciais de teste**. Copie a **Public Key** e o **Access Token de teste**. Em **Webhooks**, configure notificações de **Order** e copie a assinatura secreta de teste. Nunca envie esses valores por chat ou commit.

## 2. Variáveis da Vercel

Em **Vercel > vertex-hub-2-0 > Settings > Environment Variables**, adicione para Production/Preview:

```text
VITE_MERCADO_PAGO_PUBLIC_KEY=<PUBLIC KEY DE TESTE>
```

Essa é a única credencial Mercado Pago permitida no navegador. Faça um novo deploy após salvar.

## 3. Migration Supabase

No **Supabase Dashboard > SQL Editor > New query**, execute integralmente `supabase/migrations/202608050003_vertex_support_payments.sql`. Ela cria `support_payments`, índices, RLS e a view futura de apoiadores. Não execute apenas trechos.

## 4. Secrets e deploy das Edge Functions

No terminal autenticado e vinculado ao projeto:

```powershell
npx.cmd supabase secrets set MERCADO_PAGO_ACCESS_TOKEN="<ACCESS TOKEN DE TESTE>"
npx.cmd supabase secrets set MERCADO_PAGO_WEBHOOK_SECRET="<SEGREDO DO WEBHOOK DE TESTE>"
npx.cmd supabase secrets set MERCADO_PAGO_MODE="test"
npx.cmd supabase functions deploy mercadopago-orders
npx.cmd supabase functions deploy mercadopago-webhook --no-verify-jwt
```

`mercadopago-orders` deve manter verificação JWT. O webhook usa `--no-verify-jwt` porque o Mercado Pago não possui JWT Supabase; ele valida `x-signature` internamente.

## 5. Webhook

Na aplicação do Mercado Pago, abra **Webhooks > Configurar notificações > Modo teste**. Selecione o evento **Order** e informe exatamente:

```text
https://dsklsyftdpjwdbfxbqsp.supabase.co/functions/v1/mercadopago-webhook
```

Salve e use o simulador. Assinatura inválida retorna HTTP 401. A função consulta `GET /v1/orders/{id}` antes de atualizar o banco.

## 6. Primeira compra de teste

Entre no Vertex Hub com usuário de teste, abra **Apoie a Vertex**, escolha R$ 5 ou mais e use somente dados/cartões de teste fornecidos em **Mercado Pago Developers > Contas de teste/Cartões de teste**. Para Pix, use o QR/código retornado pelo próprio Mercado Pago. Nunca use cartão real nesta fase.

## 7. Onde localizar o Order ID

Dono ou Super Admin abre **Apoie a Vertex > Integrações → Mercado Pago**. Nas últimas Orders, clique **Copiar Order ID**. O formato normalmente começa com `ORD`. O identificador também fica em `support_payments.mercado_pago_order_id`.

## 8. Medição de qualidade

Cole o Order ID na ferramenta de qualidade/painel da integração Mercado Pago. Confirme idempotência, external reference `support_<UUID>`, webhook, Pix/cartão e status. Pagamentos de teste não geram badge real.

## 9. Credenciais de produção

Não configure agora. Quando aprovado, crie secrets produtivos separados e faça revisão de segurança, fiscal e jurídica. Nunca reutilize dados de teste como produção.

## 10. Trocar TEST → PRODUCTION

Esta versão bloqueia produção no código. A troca exige uma alteração futura revisada, credenciais produtivas, migration/configuração separada, webhook produtivo e testes finais. Alterar somente a variável não habilita cobranças reais.

## 11. Voltar para TEST

Defina `MERCADO_PAGO_MODE=test`, restaure credenciais de teste, republique as funções e redeploye o frontend com Public Key de teste. Confirme o aviso **MODO TESTE**.

## 12. Troubleshooting

- **Public Key não configurada:** confira a variável Vite na Vercel e redeploy.
- **integration_not_configured:** Access Token ausente nos secrets Supabase.
- **provider_error:** veja **Supabase > Edge Functions > Logs**; o log contém somente external reference/status, nunca token/cartão.
- **invalid_signature:** confira o segredo do webhook e se a URL/evento são do ambiente de teste.
- **401 na criação:** sessão expirada; saia e entre novamente.
- **Order não atualiza:** simule o webhook e confirme que o evento selecionado é Order.
- **Pix indisponível:** confira chave Pix e meios habilitados na conta Mercado Pago.

## Recompensas e Discord

Badges são apenas arquitetura futura. Somente pagamentos produtivos, confirmados e não reembolsados poderão contar. TODO futuro: publicar um evento desacoplado após confirmação produtiva para sincronizar cargo Discord; a integração de pagamento não depende de Discord.

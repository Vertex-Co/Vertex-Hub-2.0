import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/202608050003_vertex_support_payments.sql", "utf8");
const orders = readFileSync("supabase/functions/mercadopago-orders/index.ts", "utf8");
const webhook = readFileSync("supabase/functions/mercadopago-webhook/index.ts", "utf8");
const ui = readFileSync("src/pages/SupportVertex.tsx", "utf8");
const env = readFileSync(".env.example", "utf8");
const checks = {
  "Valor mínimo e máximo server-side": /MIN\s*=\s*5/.test(orders) && /MAX\s*=\s*1000/.test(orders) && /amount between 5 and 1000/.test(sql),
  "Usuário deriva da sessão": /auth\.getUser\(\)/.test(orders) && /user_id:\s*user\.id/.test(orders),
  "Idempotência dupla": /X-Idempotency-Key/.test(orders) && /unique\(user_id,client_request_id\)/.test(sql),
  "Orders API atual": /api\.mercadopago\.com\/v1\/orders/.test(orders),
  "Webhook HMAC e confirmação remota": /x-signature/.test(webhook) && /subtle\.sign/.test(webhook) && /v1\/orders/.test(webhook),
  "Teste não concede badge": /environment='production'/.test(sql) && /live_mode=false/.test(sql),
  "Cliente não altera status": /revoke all on public\.support_payments/.test(sql) && !/grant (insert|update|delete)/.test(sql),
  "Nenhum dado PCI persistido": !/card_number|security_code|cvv/i.test(sql),
  "UI bloqueia submit e valida valor": /if\s*\(busy\)\s*return/.test(ui) && /chosen\s*>=\s*MIN\s*&&\s*chosen\s*<=\s*MAX/.test(ui),
  "Pix, crédito, débito e 3DS/status": /bankTransfer:\s*\["pix"\]/.test(ui) && /creditCard:\s*"all"/.test(ui) && /debitCard:\s*"all"/.test(ui) && /pending_challenge/.test(ui),
  "Secrets separados": /VITE_MERCADO_PAGO_PUBLIC_KEY/.test(env) && /MERCADO_PAGO_ACCESS_TOKEN/.test(env) && /MERCADO_PAGO_WEBHOOK_SECRET/.test(env),
  "Application ID correto": /2112079474766450/.test(orders) && /APPLICATION_MISMATCH/.test(orders),
  "Erros estruturados e retry": /diagnostic_id/.test(orders) && /Tentar novamente/.test(ui),
};

for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (Object.values(checks).some((ok) => !ok)) process.exit(1);

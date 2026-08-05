import { readFileSync, existsSync } from "node:fs";
const sql=readFileSync("supabase/migrations/202608050004_vertex_donate_clean.sql","utf8"),orders=readFileSync("supabase/functions/mercado-pago-create-order/index.ts","utf8"),webhook=readFileSync("supabase/functions/mercado-pago-webhook/index.ts","utf8"),ui=readFileSync("src/pages/SupportVertex.tsx","utf8"),env=readFileSync(".env.example","utf8"),pkg=readFileSync("package.json","utf8");
const checks={
 "Arquivos antigos removidos":!existsSync("supabase/functions/mercadopago-orders/index.ts")&&!existsSync("supabase/functions/mercadopago-webhook/index.ts"),
 "Nova tabela e RLS":/vertex_support_payments/.test(sql)&&/enable row level security/.test(sql)&&/user_id = auth\.uid\(\)/.test(sql),
 "Sem escrita financeira cliente":/revoke all on public\.vertex_support_payments/.test(sql)&&!/grant (insert|update|delete)/.test(sql),
 "Application IDs por ambiente":/3277123445606852/.test(orders)&&/6192988275087581/.test(orders)&&/APPLICATION_IDS/.test(webhook)&&/expected_application_id/.test(ui),
 "Orders e idempotência":/api\.mercadopago\.com\/v1\/orders/.test(orders)&&/X-Idempotency-Key/.test(orders)&&/unique \(user_id, client_request_id\)/.test(sql),
 "JWT deriva usuário":/auth\.getUser\(\)/.test(orders)&&/user_id: user\.id/.test(orders),
 "SDK e Bricks oficiais":/@mercadopago\/sdk-js/.test(pkg)&&/loadMercadoPago/.test(ui)&&/\.create\("payment"/.test(ui)&&/\.create\("statusScreen"/.test(ui),
 "Webhook assinado e consulta remota":/x-signature/.test(webhook)&&/subtle\.sign/.test(webhook)&&/GET|v1\/orders/.test(webhook),
 "Teste não concede recompensa":/environment = 'production'/.test(sql)&&/live_mode/.test(sql)&&/approved_at: approved && mode === "production"/.test(webhook),
 "Nenhum dado PCI persistido":!/card_number|security_code|cvv/i.test(sql),
 "Secrets separados":/VITE_MERCADO_PAGO_PUBLIC_KEY/.test(env)&&/MERCADO_PAGO_ACCESS_TOKEN/.test(env)&&/MERCADO_PAGO_WEBHOOK_SECRET/.test(env),
};
for(const[name,ok]of Object.entries(checks))console.log(`${ok?"PASS":"FAIL"} ${name}`);if(Object.values(checks).some(x=>!x))process.exit(1);

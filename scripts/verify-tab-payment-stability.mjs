import { readFileSync } from "node:fs";
const auth=readFileSync("src/contexts/AuthContext.tsx","utf8"),company=readFileSync("src/contexts/CompanyContext.tsx","utf8"),app=readFileSync("src/App.tsx","utf8"),payment=readFileSync("src/pages/SupportVertex.tsx","utf8"),order=readFileSync("supabase/functions/mercado-pago-create-order/index.ts","utf8"),webhook=readFileSync("supabase/functions/mercado-pago-webhook/index.ts","utf8"),badge=readFileSync("supabase/migrations/202608050007_vertex_support_badges.sql","utf8");
const all=auth+company+app+payment;
const checks={
 "Sem reload por foco/visibilidade":!/location\.reload|navigate\(0\)|history\.go\(0\)|router\.refresh/.test(all)&&/visibilitychange/.test(payment),
 "TOKEN_REFRESHED preserva usuário":/event === "TOKEN_REFRESHED"/.test(auth)&&/current\?\.id === session\.user\.id \? current/.test(auth),
 "Empresa não desmonta em refresh silencioso":!/setLoading\(true\)/.test(company),
 "Página e pagamento persistidos":/vertex-active-page/.test(app)&&/vertex_active_support_payment/.test(payment)&&/sessionStorage/.test(payment),
 "Mesma Order consultada sem criar nova":/refreshActivePaymentStatus/.test(payment)&&/action:\s*"get"/.test(payment)&&/client_request_id/.test(order),
 "Realtime e polling moderado":/postgres_changes/.test(payment)&&/7000/.test(payment)&&/document\.visibilityState === "visible"/.test(payment),
 "Aprovação server-side":/processed/.test(order)&&/accredited/.test(order)&&/processed/.test(webhook)&&/accredited/.test(webhook),
 "Resumo e badge server-side":/vertex_support_summary/.test(payment)&&/vertex_support_badge/.test(badge)&&/refunded_at is null/.test(badge),
 "Teste fora do total real":/environment = 'production'/.test(badge)&&/live_mode/.test(badge),
 "Logs seguros de ciclo":/APP_MOUNT/.test(app)&&/PAYMENT_MOUNT/.test(payment)&&/VISIBILITY/.test(payment)&&/AUTH_EVENT/.test(auth)&&/PAYMENT_STATUS_CHANGED/.test(payment),
};
for(const[name,ok]of Object.entries(checks))console.log(`${ok?"PASS":"FAIL"} ${name}`);if(Object.values(checks).some(x=>!x))process.exit(1);

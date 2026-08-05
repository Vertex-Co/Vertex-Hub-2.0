import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APPLICATION_IDS = { test: "3277123445606852", production: "6192988275087581" } as const;
const ORDERS_URL = "https://api.mercadopago.com/v1/orders";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const clean = (value: unknown, max = 300) => String(value ?? "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max);
const providerError = (body: any, status: number) => {
  const nested = body?.transactions?.payments?.flatMap((p: any) => p?.errors ?? []) ?? [];
  const items = [...(Array.isArray(body?.errors) ? body.errors : []), ...(Array.isArray(body?.cause) ? body.cause : []), ...nested];
  return {
    http_status: status,
    code: clean(body?.code ?? body?.error ?? items[0]?.code ?? `MP_${status}`, 80),
    message: clean(body?.message ?? body?.status_detail ?? items[0]?.message ?? "Order recusada pelo Mercado Pago."),
    details: items.slice(0, 5).map((x: any) => clean(`${x?.code ?? "validation"}: ${x?.message ?? x?.description ?? "invalid"}`, 240)),
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return reply({ success: false, error_code: "METHOD_NOT_ALLOWED", message: "Método não permitido." }, 405);
  const diagnosticId = crypto.randomUUID();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const accessToken = (Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") ?? "").trim();
    const mode = (Deno.env.get("MERCADO_PAGO_MODE") ?? "test").toLowerCase();
    const maxAmount = Math.max(1, Math.min(100000, Number(Deno.env.get("MERCADO_PAGO_MAX_AMOUNT") ?? 1000)));
    if (!accessToken) return reply({ success: false, error_code: "MP_NOT_CONFIGURED", diagnostic_id: diagnosticId, message: "Access Token ausente." }, 503);
    if (!/^[A-Za-z0-9._-]+$/.test(accessToken)) return reply({ success: false, error_code: "MP_INVALID_SECRET_FORMAT", diagnostic_id: diagnosticId, message: "Access Token com formato inválido." }, 503);
    if (!['test', 'production'].includes(mode)) return reply({ success: false, error_code: "MP_INVALID_MODE", diagnostic_id: diagnosticId, message: "Modo Mercado Pago inválido." }, 503);
    const expectedApplicationId = APPLICATION_IDS[mode as keyof typeof APPLICATION_IDS];

    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } });
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ success: false, error_code: "SUPABASE_UNAUTHORIZED", diagnostic_id: diagnosticId, message: "Sessão inválida ou expirada." }, 401);
    const body = await request.json();
    const action = String(body.action ?? "create");

    if (action === "runtime-config") return reply({ success: true, mode, max_amount: maxAmount, expected_application_id: expectedApplicationId });

    if (action === "config") {
      const { data: profile } = await admin.from("profiles").select("global_role,authorized_company_id").eq("user_id", user.id).single();
      let allowed = profile?.global_role === "super_admin";
      if (!allowed && profile?.authorized_company_id) {
        const { data: member } = await admin.from("company_members").select("role").eq("company_id", profile.authorized_company_id).eq("user_id", user.id).maybeSingle();
        allowed = member?.role === "company_owner";
      }
      if (!allowed) return reply({ success: false, error_code: "FORBIDDEN", message: "Acesso negado." }, 403);
      const { data: orders } = await admin.from("vertex_support_payments").select("id,mercado_pago_order_id,external_reference,amount,payment_method,payment_method_type,status,status_detail,mercado_pago_application_id,environment,created_at").order("created_at", { ascending: false }).limit(50);
      return reply({ success: true, application: "Vertex Donate", expected_application_id: expectedApplicationId, production_application_id: APPLICATION_IDS.production, test_application_id: APPLICATION_IDS.test, mode, max_amount: maxAmount, access_token_configured: true, webhook_secret_configured: Boolean(Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET")), orders: orders ?? [] });
    }
    if (action === "get") {
      const { data } = await admin.from("vertex_support_payments").select("id,mercado_pago_order_id,external_reference,amount,currency,payment_method,payment_method_type,status,status_detail,environment,live_mode,mercado_pago_application_id,created_at,approved_at,refunded_at,safe_provider_data").eq("id", clean(body.id, 80)).eq("user_id", user.id).maybeSingle();
      return data ? reply({ success: true, payment: data }) : reply({ success: false, error_code: "NOT_FOUND", message: "Apoio não encontrado." }, 404);
    }

    const amount = Number(body.amount);
    const clientRequestId = clean(body.client_request_id, 80);
    if (!Number.isFinite(amount) || amount < 1 || amount > maxAmount || Math.round(amount * 100) !== amount * 100 || !/^[0-9a-f-]{36}$/i.test(clientRequestId)) return reply({ success: false, error_code: "INVALID_INPUT", diagnostic_id: diagnosticId, message: `Use um valor entre R$ 1 e R$ ${maxAmount}.` }, 400);
    const { data: existing } = await admin.from("vertex_support_payments").select("id,mercado_pago_order_id,status,status_detail,safe_provider_data").eq("user_id", user.id).eq("client_request_id", clientRequestId).maybeSingle();
    if (existing) return reply({ success: true, reused: true, payment: existing });

    const id = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const externalReference = `support_${id}`;
    const { data: profile } = await admin.from("profiles").select("authorized_company_id").eq("user_id", user.id).single();
    const { error: insertError } = await admin.from("vertex_support_payments").insert({ id, user_id: user.id, company_id: profile?.authorized_company_id ?? null, client_request_id: clientRequestId, external_reference: externalReference, idempotency_key: idempotencyKey, amount, currency: "BRL", message: clean(body.message, 200) || null, is_public: body.is_public === true, environment: mode, live_mode: false });
    if (insertError) return reply({ success: false, error_code: "DATABASE_INSERT_FAILED", diagnostic_id: diagnosticId, message: "Não foi possível registrar a tentativa." }, 500);

    const form = body.form_data ?? {};
    const paymentMethodId = clean(form.payment_method_id, 50);
    const allowedTypes = ["credit_card", "debit_card", "ticket", "atm", "bank_transfer", "account_money", "prepaid_card", "digital_currency", "smart_transfer", "wallet"];
    const selectedType = clean(form.payment_type_id ?? body.selected_payment_method, 50);
    const paymentMethodType = allowedTypes.includes(selectedType) ? selectedType : paymentMethodId === "pix" ? "bank_transfer" : form.token ? "credit_card" : "";
    if (!paymentMethodId || !paymentMethodType) return reply({ success: false, error_code: "INVALID_PAYMENT_METHOD", diagnostic_id: diagnosticId, message: "Método de pagamento inválido." }, 400);
    const paymentMethod: Record<string, unknown> = { id: paymentMethodId, type: paymentMethodType };
    if (form.token) paymentMethod.token = String(form.token);
    if (Number(form.installments) > 0) paymentMethod.installments = Number(form.installments);
    const payer = mode === "test" ? { email: `vertex_${user.id.replaceAll("-", "").slice(0, 20)}@testuser.com`, first_name: "APRO" } : { email: clean(user.email, 200) };
    const payload = { type: "online", processing_mode: "automatic", external_reference: externalReference, total_amount: amount.toFixed(2), payer, transactions: { payments: [{ amount: amount.toFixed(2), payment_method: paymentMethod }] } };
    console.log("vertex_donate_order_start", { diagnosticId, externalReference, amount, mode, endpoint: "/v1/orders", idempotencyPrefix: idempotencyKey.slice(0, 8) });
    const response = await fetch(ORDERS_URL, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) });
    const order = await response.json().catch(() => ({}));
    const transaction = order?.transactions?.payments?.[0] ?? {};
    const applicationId = clean(order?.integration_data?.application_id, 32);
    console.log("vertex_donate_order_result", { diagnosticId, httpStatus: response.status, orderId: clean(order?.id, 80), status: clean(order?.status, 80), statusDetail: clean(transaction?.status_detail ?? order?.status_detail, 120), applicationId });
    if (!response.ok) {
      const error = providerError(order, response.status);
      await admin.from("vertex_support_payments").update({ payment_method: paymentMethodId, payment_method_type: paymentMethodType, status: "failed", status_detail: `${error.code}: ${error.message}`.slice(0, 500), safe_provider_data: { diagnostic_id: diagnosticId, provider_error: error }, updated_at: new Date().toISOString() }).eq("id", id);
      return reply({ success: false, error_code: "MP_ORDER_CREATION_FAILED", diagnostic_id: diagnosticId, message: "Não foi possível gerar o pagamento.", provider_error: error }, 502);
    }
    const environmentMismatch = mode === "test" ? order.live_mode === true : order.live_mode !== true;
    if (applicationId !== expectedApplicationId || environmentMismatch) {
      await admin.from("vertex_support_payments").update({ mercado_pago_order_id: clean(order.id, 100) || null, mercado_pago_application_id: applicationId || null, payment_method: paymentMethodId, payment_method_type: paymentMethodType, status: "configuration_mismatch", status_detail: applicationId !== expectedApplicationId ? "APPLICATION_MISMATCH" : "ENVIRONMENT_MISMATCH", live_mode: order.live_mode === true, safe_provider_data: { diagnostic_id: diagnosticId }, updated_at: new Date().toISOString() }).eq("id", id);
      return reply({ success: false, error_code: applicationId !== expectedApplicationId ? "APPLICATION_MISMATCH" : "ENVIRONMENT_MISMATCH", diagnostic_id: diagnosticId, message: "A Order foi criada por uma aplicação ou ambiente incorreto.", expected_application_id: expectedApplicationId, order_application_id: applicationId }, 502);
    }
    const safeData = { diagnostic_id: diagnosticId, transaction_id: transaction.id, qr_code: transaction.payment_method?.qr_code, qr_code_base64: transaction.payment_method?.qr_code_base64, ticket_url: transaction.payment_method?.ticket_url };
    const { error: updateError } = await admin.from("vertex_support_payments").update({ mercado_pago_order_id: String(order.id), mercado_pago_application_id: applicationId, payment_method: paymentMethodId, payment_method_type: paymentMethodType, status: transaction.status ?? order.status ?? "processing", status_detail: transaction.status_detail ?? order.status_detail ?? null, live_mode: order.live_mode === true, safe_provider_data: safeData, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) return reply({ success: false, error_code: "ORDER_RECONCILIATION_REQUIRED", diagnostic_id: diagnosticId, message: "Order criada; sincronização com o banco pendente.", order_id: clean(order.id, 80) }, 500);
    return reply({ success: true, payment: { id, order_id: order.id, external_reference: externalReference, application_id: applicationId, processing_mode: order.processing_mode, status: transaction.status ?? order.status, status_detail: transaction.status_detail ?? order.status_detail, payment_method: paymentMethodId, payment_method_type: paymentMethodType, environment: mode, transaction_id: transaction.id, safe_provider_data: safeData, created_at: order.date_created ?? new Date().toISOString() } });
  } catch (error) {
    console.error("vertex_donate_internal_error", { diagnosticId, name: error instanceof Error ? clean(error.name, 80) : "unknown", message: error instanceof Error ? clean(error.message, 240) : "unknown" });
    return reply({ success: false, error_code: "INTERNAL_ERROR", diagnostic_id: diagnosticId, message: "Erro interno ao criar o pagamento." }, 500);
  }
});

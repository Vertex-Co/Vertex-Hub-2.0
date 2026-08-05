import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const safeText = (value: unknown, max = 300) =>
  String(value ?? "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max);
const MIN = 5;
const MAX = 1000;
const EXPECTED_APPLICATION_ID = "4794463110657477";
const MP_ORDERS_URL = "https://api.mercadopago.com/v1/orders";

type ProviderError = {
  code: string;
  message: string;
  details: string[];
};

function providerError(body: any, httpStatus: number): ProviderError {
  const nested = body?.transactions?.payments?.flatMap((payment: any) => payment?.errors ?? payment?.error ?? []) ?? [];
  const errors = [...(Array.isArray(body?.errors) ? body.errors : []), ...(Array.isArray(body?.cause) ? body.cause : []), ...nested];
  const details = errors.map((item: any) =>
    safeText(`${item?.code ?? item?.error ?? "validation_error"}: ${item?.message ?? item?.description ?? "invalid"}${item?.details ? ` ${typeof item.details === "string" ? item.details : JSON.stringify(item.details)}` : ""}`, 300)
  ).filter(Boolean).slice(0, 5);
  return {
    code: safeText(body?.code ?? body?.error ?? errors[0]?.code ?? `MP_${httpStatus}`, 80),
    message: safeText(body?.message ?? body?.status_detail ?? errors[0]?.message ?? "Mercado Pago recusou a criação da Order.", 300),
    details,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, code: "METHOD_NOT_ALLOWED", message: "Método não permitido." }, 405);

  const diagnosticId = crypto.randomUUID();
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") ?? "";
    const mode = Deno.env.get("MERCADO_PAGO_MODE") ?? "test";
    if (mode !== "test") return json({ success: false, code: "PRODUCTION_DISABLED", message: "Somente o ambiente TEST está habilitado.", diagnostic_id: diagnosticId }, 503);
    if (!token) return json({ success: false, code: "INTEGRATION_NOT_CONFIGURED", message: "Access Token não configurado no servidor.", diagnostic_id: diagnosticId }, 503);

    const authorization = req.headers.get("Authorization") ?? "";
    const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ success: false, code: "SUPABASE_UNAUTHORIZED", message: "Sessão inválida ou expirada.", diagnostic_id: diagnosticId }, 401);

    const body = await req.json();
    const action = String(body.action ?? "create");
    if (action === "config") {
      const { data: profile } = await admin.from("profiles").select("global_role,authorized_company_id").eq("user_id", user.id).single();
      let allowed = profile?.global_role === "super_admin";
      if (!allowed && profile?.authorized_company_id) {
        const { data: member } = await admin.from("company_members").select("role").eq("company_id", profile.authorized_company_id).eq("user_id", user.id).maybeSingle();
        allowed = member?.role === "company_owner";
      }
      if (!allowed) return json({ success: false, code: "FORBIDDEN", message: "Acesso negado." }, 403);
      const { data: rows } = await admin.from("support_payments").select("id,user_id,mercado_pago_order_id,external_reference,amount,payment_method,order_status,transaction_status,status_detail,environment,created_at").order("created_at", { ascending: false }).limit(50);
      return json({ success: true, mode, projectRef: new URL(url).hostname.split(".")[0], expectedApplicationId: EXPECTED_APPLICATION_ID, publicKeyConfigured: Boolean(Deno.env.get("MERCADO_PAGO_PUBLIC_KEY")), accessTokenConfigured: Boolean(token), webhookSecretConfigured: Boolean(Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET")), orders: rows ?? [] });
    }
    if (action === "get") {
      const id = safeText(body.id, 80);
      const { data } = await admin.from("support_payments").select("id,mercado_pago_order_id,external_reference,amount,currency,payment_method,order_status,transaction_status,status_detail,environment,live_mode,created_at,paid_at,raw_safe_response").eq("id", id).eq("user_id", user.id).single();
      return data ? json({ success: true, payment: data }) : json({ success: false, code: "NOT_FOUND", message: "Pagamento não encontrado." }, 404);
    }

    const amount = Number(body.amount);
    const currency = String(body.currency ?? "BRL");
    const clientRequestId = String(body.client_request_id ?? "");
    if (!Number.isFinite(amount) || amount < MIN || amount > MAX || Math.round(amount * 100) !== amount * 100 || currency !== "BRL" || !/^[0-9a-f-]{36}$/i.test(clientRequestId)) {
      return json({ success: false, code: "INVALID_INPUT", message: "Dados do pagamento inválidos.", diagnostic_id: diagnosticId }, 400);
    }
    const { data: existing } = await admin.from("support_payments").select("id,mercado_pago_order_id,order_status,transaction_status,status_detail,raw_safe_response").eq("user_id", user.id).eq("client_request_id", clientRequestId).maybeSingle();
    if (existing) return json({ success: true, payment: existing, reused: true });

    const id = crypto.randomUUID();
    const idempotency = crypto.randomUUID();
    const external = `support_${id}`;
    const message = safeText(body.message, 200);
    const { data: profile } = await admin.from("profiles").select("authorized_company_id").eq("user_id", user.id).single();
    const { error: insertError } = await admin.from("support_payments").insert({ id, user_id: user.id, company_id: profile?.authorized_company_id ?? null, client_request_id: clientRequestId, external_reference: external, idempotency_key: idempotency, amount, currency, message: message || null, is_public: body.is_public === true, environment: "test", live_mode: false });
    if (insertError) {
      console.error("mp_order_db_insert_failed", { diagnosticId, errorCode: insertError.code });
      return json({ success: false, code: "SUPABASE_INSERT_ERROR", message: "Não foi possível registrar a tentativa.", diagnostic_id: diagnosticId }, 500);
    }

    const form = body.form_data ?? {};
    const method = String(form.payment_method_id ?? "");
    const allowedTypes = ["credit_card", "debit_card", "ticket", "atm", "bank_transfer", "account_money", "prepaid_card", "digital_currency", "smart_transfer", "wallet"];
    const candidate = String(form.payment_type_id ?? body.selected_payment_method ?? "");
    const type = allowedTypes.includes(candidate) ? candidate : method === "pix" ? "bank_transfer" : form.token ? "credit_card" : "";
    if (!method || !type) return json({ success: false, code: "INVALID_PAYMENT_METHOD", message: "Método de pagamento inválido.", diagnostic_id: diagnosticId }, 400);
    const paymentMethod: Record<string, unknown> = { id: method, type };
    if (form.token) paymentMethod.token = String(form.token);
    if (Number(form.installments) > 0) paymentMethod.installments = Number(form.installments);

    const sandboxEmail = `vertex_${user.id.replace(/-/g, "").slice(0, 20)}@testuser.com`;
    const orderBody = { type: "online", processing_mode: "automatic", external_reference: external, total_amount: amount.toFixed(2), payer: { email: sandboxEmail, first_name: "APRO" }, transactions: { payments: [{ amount: amount.toFixed(2), payment_method: paymentMethod }] } };
    console.log("mp_order_start", { diagnosticId, userId: user.id, amount, environment: mode, externalReference: external, idempotencyPrefix: idempotency.slice(0, 8), endpoint: "/v1/orders", paymentMethod: method, paymentType: type });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response: Response;
    try {
      response = await fetch(MP_ORDERS_URL, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": idempotency }, body: JSON.stringify(orderBody), signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    const order = await response.json().catch(() => ({}));
    const transaction = order?.transactions?.payments?.[0] ?? {};
    const applicationId = safeText(order?.integration_data?.application_id, 32);
    console.log("mp_order_result", { diagnosticId, httpStatus: response.status, orderId: safeText(order?.id, 80), status: safeText(order?.status, 80), statusDetail: safeText(order?.status_detail ?? transaction?.status_detail, 120), applicationId });

    if (!response.ok) {
      const provider = providerError(order, response.status);
      console.error("mp_order_provider_error", { diagnosticId, httpStatus: response.status, code: provider.code, message: provider.message, details: provider.details });
      const { error: updateError } = await admin.from("support_payments").update({ payment_method: method, order_status: "failed", status_detail: `${provider.code}: ${provider.message}`.slice(0, 500), raw_safe_response: { diagnostic_id: diagnosticId, provider_http_status: response.status, provider_code: provider.code, provider_message: provider.message, provider_details: provider.details }, updated_at: new Date().toISOString() }).eq("id", id);
      if (updateError) console.error("mp_order_db_error_record_failed", { diagnosticId, errorCode: updateError.code });
      return json({ success: false, code: "MERCADO_PAGO_ORDER_ERROR", message: "Não foi possível criar o pagamento.", diagnostic_id: diagnosticId, provider: { http_status: response.status, code: provider.code, message: provider.message, details: provider.details } }, 502);
    }

    if (order.live_mode === true || applicationId !== EXPECTED_APPLICATION_ID) {
      const mismatchCode = order.live_mode === true ? "LIVE_ORDER_BLOCKED" : "APPLICATION_MISMATCH";
      await admin.from("support_payments").update({ mercado_pago_order_id: safeText(order.id, 100) || null, payment_method: method, order_status: "blocked_configuration_mismatch", live_mode: order.live_mode === true, status_detail: mismatchCode, raw_safe_response: { diagnostic_id: diagnosticId, application_id: applicationId }, updated_at: new Date().toISOString() }).eq("id", id);
      return json({ success: false, code: mismatchCode, message: "A Order não pertence ao ambiente/aplicação TEST esperados.", diagnostic_id: diagnosticId, application_id: applicationId }, 502);
    }

    const safe = { diagnostic_id: diagnosticId, application_id: applicationId, transaction_id: transaction.id, pix_qr_code: transaction.payment_method?.qr_code, pix_qr_code_base64: transaction.payment_method?.qr_code_base64, ticket_url: transaction.payment_method?.ticket_url };
    const { error: updateError } = await admin.from("support_payments").update({ mercado_pago_order_id: String(order.id), payment_method: method, order_status: order.status ?? "processing", transaction_status: transaction.status ?? null, status_detail: transaction.status_detail ?? order.status_detail ?? null, live_mode: false, raw_safe_response: safe, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) {
      console.error("mp_order_created_db_update_failed", { diagnosticId, orderId: safeText(order.id, 80), errorCode: updateError.code });
      return json({ success: false, code: "ORDER_CREATED_RECONCILIATION_REQUIRED", message: "A Order foi criada, mas requer reconciliação no banco.", diagnostic_id: diagnosticId, order_id: safeText(order.id, 80) }, 500);
    }
    return json({ success: true, payment: { id, order_id: order.id, external_reference: external, application_id: applicationId, status: order.status, status_detail: order.status_detail, transaction_status: transaction.status, transaction_id: transaction.id, payment_method: transaction.payment_method?.type ?? type, environment: "test", created_at: order.date_created ?? new Date().toISOString(), pix: safe } });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    console.error("mp_order_internal_error", { diagnosticId, kind: isTimeout ? "timeout" : "internal" });
    return json({ success: false, code: isTimeout ? "MERCADO_PAGO_TIMEOUT" : "INTERNAL_ERROR", message: isTimeout ? "O Mercado Pago demorou para responder." : "Erro interno ao criar o pagamento.", diagnostic_id: diagnosticId }, 500);
  }
});

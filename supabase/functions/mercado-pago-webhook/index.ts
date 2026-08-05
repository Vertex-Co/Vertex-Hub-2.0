import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APPLICATION_IDS = { test: "3277123445606852", production: "6192988275087581" } as const;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const clean = (value: unknown, max = 200) => String(value ?? "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max);
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ success: false, error_code: "METHOD_NOT_ALLOWED" }, 405);
  const diagnosticId = crypto.randomUUID();
  try {
    const secret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET") ?? "";
    const token = (Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") ?? "").trim();
    const mode = (Deno.env.get("MERCADO_PAGO_MODE") ?? "test").toLowerCase();
    if (!['test', 'production'].includes(mode)) return json({ success: false, error_code: "INVALID_MODE" }, 503);
    const expectedApplicationId = APPLICATION_IDS[mode as keyof typeof APPLICATION_IDS];
    if (!secret || !token) return json({ success: false, error_code: "WEBHOOK_NOT_CONFIGURED" }, 503);
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const dataId = clean(url.searchParams.get("data.id") ?? body?.data?.id, 100);
    const requestId = clean(request.headers.get("x-request-id"), 100);
    const parts = Object.fromEntries((request.headers.get("x-signature") ?? "").split(",").map((part) => part.trim().split("=", 2)));
    if (!dataId || !requestId || !parts.ts || !parts.v1) return json({ success: false, error_code: "INVALID_SIGNATURE" }, 401);
    const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)));
    if (!timingSafeEqual(expected, String(parts.v1))) return json({ success: false, error_code: "INVALID_SIGNATURE" }, 401);

    const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(dataId)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return json({ success: false, error_code: "ORDER_LOOKUP_FAILED" }, 502);
    const order = await response.json();
    const transaction = order?.transactions?.payments?.[0] ?? {};
    const applicationId = clean(order?.integration_data?.application_id, 32);
    const expectedLiveMode = mode === "production";
    const providerLiveMode = typeof order.live_mode === "boolean" ? order.live_mode : undefined;
    const effectiveLiveMode = providerLiveMode ?? expectedLiveMode;
    if (applicationId !== expectedApplicationId || (providerLiveMode !== undefined && providerLiveMode !== expectedLiveMode)) return json({ success: false, error_code: "ORDER_CONFIGURATION_MISMATCH" }, 409);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: local } = await supabase.from("vertex_support_payments").select("id,amount,currency,external_reference,mercado_pago_order_id,environment").eq("external_reference", order.external_reference).eq("mercado_pago_order_id", String(order.id)).maybeSingle();
    if (!local || Number(local.amount) !== Number(order.total_amount) || local.currency !== (order.currency ?? "BRL") || local.environment !== mode) return json({ success: false, error_code: "ORDER_DATA_MISMATCH" }, 409);
    const providerStatus = clean(transaction.status ?? order.status ?? "processing", 80);
    const statusDetail = clean(transaction.status_detail ?? order.status_detail, 120);
    const status = providerStatus === "processed" && statusDetail === "accredited" ? "approved" : providerStatus;
    const refunded = status === "refunded";
    const approved = status === "approved";
    const { error } = await supabase.from("vertex_support_payments").update({ status, status_detail: statusDetail || null, payment_method: transaction.payment_method?.id ?? null, payment_method_type: transaction.payment_method?.type ?? null, mercado_pago_application_id: applicationId, mercado_pago_user_id: clean(order?.user_id, 40) || null, live_mode: effectiveLiveMode, approved_at: approved && mode === "production" ? new Date().toISOString() : null, refunded_at: refunded ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", local.id);
    if (error) return json({ success: false, error_code: "DATABASE_UPDATE_FAILED" }, 500);
    console.log("vertex_donate_webhook_ok", { diagnosticId, orderId: clean(order.id, 80), externalReference: clean(order.external_reference, 100), status, statusDetail: clean(transaction.status_detail, 120), applicationId });
    return json({ success: true });
  } catch (error) {
    console.error("vertex_donate_webhook_error", { diagnosticId, name: error instanceof Error ? clean(error.name, 80) : "unknown" });
    return json({ success: false, error_code: "INTERNAL_ERROR", diagnostic_id: diagnosticId }, 500);
  }
});

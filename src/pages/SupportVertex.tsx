import { Copy, Heart, ShieldCheck } from "lucide-react";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input } from "../components/ui/Common";
import { useCompany } from "../contexts/CompanyContext";
import { supabase } from "../services/supabase";
declare global {
  interface Window {
    MercadoPago: any;
  }
}
type Payment = {
  id: string;
  mercado_pago_order_id?: string;
  external_reference: string;
  amount: number;
  payment_method?: string;
  status: string;
  status_detail?: string;
  environment: string;
  created_at: string;
};
const MIN = 1,
  MAX = 1000,
  quick = [1, 5, 10, 25, 50, 100];
const label = (v?: string) =>
  ({
    created: "Aguardando pagamento",
    pending: "Aguardando pagamento",
    processing: "Processando",
    approved: "Aprovado",
    rejected: "Recusado",
    cancelled: "Cancelado",
    expired: "Expirado",
    refunded: "Reembolsado",
    pending_challenge: "Ação adicional / 3DS",
    failed: "Erro",
  })[v ?? ""] ??
  v ??
  "Processando";
export function SupportVertex() {
  const { isAdmin } = useCompany();
  const [amount, setAmount] = useState(10),
    [custom, setCustom] = useState(""),
    [message, setMessage] = useState(""),
    [isPublic, setPublic] = useState(false),
    [checkout, setCheckout] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<any>(),
    [history, setHistory] = useState<Payment[]>([]),
    [admin, setAdmin] = useState<any>();
  const brick = useRef<any>(null),
    requestId = useRef(crypto.randomUUID());
  const publicKey = String(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ?? "");
  const chosen = custom ? Number(custom.replace(",", ".")) : amount;
  const retry = () => {
    requestId.current = crypto.randomUUID();
    setError("");
    void brick.current?.unmount();
    brick.current = null;
    setCheckout(false);
    setTimeout(() => setCheckout(true), 0);
  };
  const load = async () => {
    const { data } = await supabase
      .from("vertex_support_payments")
      .select(
        "id,mercado_pago_order_id,external_reference,amount,payment_method,status,status_detail,environment,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data ?? []) as Payment[]);
    if (isAdmin) {
      const r = await supabase.functions.invoke("mercado-pago-create-order", {
        body: { action: "config" },
      });
      if (!r.error) setAdmin(r.data);
    }
  };
  useEffect(() => {
    void load();
  }, [isAdmin]);
  useEffect(() => {
    if (!checkout || !publicKey) return;
    let alive = true;
    const render = async () => {
      await loadMercadoPago();
      if (!alive) return;
      const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      brick.current = await mp
        .bricks()
        .create("payment", "paymentBrick_container", {
          initialization: { amount: chosen },
          customization: {
            visual: {
              style: {
                theme: document.documentElement.classList.contains("dark")
                  ? "dark"
                  : "default",
              },
            },
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              bankTransfer: ["pix"],
              maxInstallments: 12,
            },
          },
          callbacks: {
            onReady: () => setError(""),
            onError: (e: any) =>
              setError(e?.message ?? "Não foi possível carregar o checkout."),
            onSubmit: async ({
              selectedPaymentMethod,
              formData,
            }: {
              selectedPaymentMethod?: string;
              formData: any;
            }) => {
              if (busy) return;
              setBusy(true);
              setError("");
              const { data, error: e } = await supabase.functions.invoke(
                "mercado-pago-create-order",
                {
                  body: {
                    action: "create",
                    amount: chosen,
                    currency: "BRL",
                    client_request_id: requestId.current,
                    message,
                    is_public: isPublic,
                    selected_payment_method: selectedPaymentMethod,
                    form_data: formData,
                  },
                },
              );
              setBusy(false);
              if (e || data?.success === false || data?.error) {
                const diagnostic = data?.diagnostic_id
                  ? ` Diagnóstico: ${data.diagnostic_id}.`
                  : "";
                const provider = data?.provider_error?.code
                  ? ` Código: ${data.provider_error.code}.`
                  : data?.error_code
                    ? ` Código: ${data.error_code}.`
                    : "";
                setError(
                  `${data?.message ?? "Não foi possível gerar o pagamento de teste."}${provider}${diagnostic}`,
                );
                throw e ?? new Error(data?.error_code ?? data?.error);
              }
              setResult(data.payment);
              await load();
            },
          },
        });
    };
    void render();
    return () => {
      alive = false;
      void brick.current?.unmount();
    };
  }, [checkout, publicKey, chosen]);
  useEffect(() => {
    if (
      !result?.id ||
      [
        "approved",
        "rejected",
        "cancelled",
        "expired",
        "refunded",
        "failed",
      ].includes(result.status)
    )
      return;
    const timer = setInterval(async () => {
      const { data } = await supabase.functions.invoke("mercado-pago-create-order", {
        body: { action: "get", id: result.id },
      });
      if (data?.payment)
        setResult((old: any) => ({
          ...old,
          ...data.payment,
          status: data.payment.status,
          safe_provider_data: data.payment.safe_provider_data,
        }));
    }, 5000);
    return () => clearInterval(timer);
  }, [result?.id, result?.status]);
  useEffect(() => {
    if (!result?.transaction_id || !window.MercadoPago || !publicKey) return;
    let screen: any;
    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
    void mp
      .bricks()
      .create("statusScreen", "statusScreenBrick_container", {
        initialization: { paymentId: result.transaction_id },
        callbacks: { onReady: () => {}, onError: () => {} },
      })
      .then((x: any) => (screen = x));
    return () => {
      void screen?.unmount();
    };
  }, [result?.transaction_id, publicKey]);
  const valid =
    Number.isFinite(chosen) &&
    chosen >= MIN &&
    chosen <= MAX &&
    Math.round(chosen * 100) === chosen * 100;
  const testTotal = useMemo(
    () =>
      history
        .filter(
          (x) => x.environment === "test" && x.status === "approved",
        )
        .reduce((s, x) => s + Number(x.amount), 0),
    [history],
  );
  const pix = result?.safe_provider_data;
  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-blue-500">
          Contribuição voluntária • ambiente de testes
        </p>
        <h2 className="text-3xl font-black">Apoie a Vertex 💙</h2>
        <p className="mt-3 max-w-3xl text-sm text-zinc-500">
          Deseja apoiar a Vertex e ajudar o projeto a se manter? Sua
          contribuição ajuda na manutenção, desenvolvimento e evolução do Vertex
          Hub.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          O apoio é voluntário e não é necessário para utilizar os recursos
          normais disponíveis na sua conta. Não representa investimento,
          participação ou promessa de retorno financeiro.
        </p>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
            <b>MODO TESTE</b> — nenhuma cobrança real ou recompensa permanente
            será concedida.
          </div>
          {!checkout && !result && (
            <>
              <h3 className="mt-5 font-bold">Escolha um valor</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {quick.map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setAmount(v);
                      setCustom("");
                    }}
                    className={`rounded-xl border p-3 text-sm font-bold ${!custom && amount === v ? "border-blue-500 bg-blue-500/10 text-blue-500" : "dark:border-zinc-700"}`}
                  >
                    R$ {v}
                  </button>
                ))}
              </div>
              <label className="mt-4 block">
                Outro valor
                <Input
                  inputMode="decimal"
                  placeholder="Entre R$ 1 e R$ 1.000"
                  value={custom}
                  onChange={(e) =>
                    setCustom(e.target.value.replace(/[^0-9,.]/g, ""))
                  }
                />
              </label>
              <label className="mt-4 block">
                Deixe uma mensagem para a equipe Vertex 💙
                <textarea
                  maxLength={200}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 min-h-24 w-full rounded-xl border bg-transparent p-3 text-sm dark:border-zinc-700"
                />
                <span className="text-xs text-zinc-500">
                  {message.length}/200
                </span>
              </label>
              <label className="mt-4 flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setPublic(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Exibir meu nome na comunidade como apoiador. Nunca exibiremos
                  valor, e-mail, telefone ou dados de pagamento.
                </span>
              </label>
              <Button
                className="mt-5 w-full"
                disabled={!valid || !publicKey}
                onClick={() => setCheckout(true)}
              >
                Continuar com R${" "}
                {valid ? chosen.toFixed(2).replace(".", ",") : "—"}
              </Button>
              {!publicKey && (
                <p className="mt-3 text-sm text-red-500">
                  Public Key de teste não configurada.
                </p>
              )}
            </>
          )}
          {checkout && !result && (
            <>
              <div className="mt-5 flex items-center justify-between">
                <b>Checkout seguro Mercado Pago</b>
                <button
                  className="text-sm text-blue-500"
                  onClick={() => setCheckout(false)}
                >
                  Alterar valor
                </button>
              </div>
              <div id="paymentBrick_container" className="mt-4 min-h-80" />
            </>
          )}
          {result && (
            <div className="mt-5">
              <ShieldCheck className="text-blue-500" size={36} />
              <h3 className="mt-3 text-xl font-black">
                {label(result.status)}
              </h3>
              <p className="text-sm text-zinc-500">
                Pagamento de teste • R$ {chosen.toFixed(2).replace(".", ",")}
              </p>
              {pix?.qr_code_base64 && (
                <img
                  className="mx-auto mt-4 max-w-64"
                  alt="QR Code Pix retornado pelo Mercado Pago"
                  src={`data:image/png;base64,${pix.qr_code_base64}`}
                />
              )}{" "}
              {pix?.qr_code && (
                <>
                  <textarea
                    readOnly
                    value={pix.qr_code}
                    className="mt-4 h-24 w-full rounded-xl border bg-transparent p-3 text-xs dark:border-zinc-700"
                  />
                  <Button
                    className="mt-2"
                    onClick={() =>
                      void navigator.clipboard.writeText(pix.qr_code)
                    }
                  >
                    <Copy size={16} />
                    Copiar código Pix
                  </Button>
                  <p className="mt-3 text-sm text-zinc-500">
                    Aguardando pagamento... O pagamento será identificado
                    automaticamente. Não é necessário enviar comprovante.
                  </p>
                </>
              )}
              {isAdmin && result.order_id && (
                <p className="mt-4 break-all rounded-xl bg-zinc-100 p-3 text-xs dark:bg-zinc-950">
                  Order ID: {result.order_id}
                </p>
              )}
              <Button
                className="mt-5"
                variant="secondary"
                onClick={() => {
                  setResult(undefined);
                  setCheckout(false);
                  requestId.current = crypto.randomUUID();
                }}
              >
                Fazer outro apoio teste
              </Button>
            </div>
          )}
          {error && (
            <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-500">
              <p>{error}</p>
              {checkout && !result && (
                <Button className="mt-3" variant="secondary" onClick={retry}>
                  Tentar novamente
                </Button>
              )}
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card>
            <Heart className="text-blue-500" />
            <h3 className="mt-3 font-bold">Meu apoio à Vertex</h3>
            <p className="mt-3 text-2xl font-black">
              R$ {testTotal.toFixed(2).replace(".", ",")}
            </p>
            <p className="text-xs font-bold text-amber-500">
              DADOS DE TESTE — não compõem saldo ou badge real.
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              {history.length} tentativa(s) registrada(s).
            </p>
          </Card>
          {isAdmin && (
            <Card>
              <h3 className="font-bold">Integrações → Mercado Pago</h3>
              <p className="mt-2 text-sm text-zinc-500">
                Modo: <b>{admin?.mode?.toUpperCase() ?? "TESTE"}</b>
              </p>
              <p className="mt-1 text-sm text-zinc-500">Aplicação: <b>Vertex Donate</b></p>
              <p className="text-sm text-zinc-500">Application ID esperado em {admin?.mode?.toUpperCase() ?? "TEST"}: <b>{admin?.expected_application_id ?? "3277123445606852"}</b></p>
              <div className="mt-3 grid gap-2 text-sm">
                <span>
                  Public Key: {publicKey ? "Configurada" : "Não configurada"}
                </span>
                <span>
                  Access Token:{" "}
                  {admin?.access_token_configured
                    ? "Configurado"
                    : "Não configurado"}
                </span>
                <span>
                  Webhook Secret:{" "}
                  {admin?.webhook_secret_configured
                    ? "Configurado"
                    : "Não configurado"}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {(admin?.orders ?? []).slice(0, 10).map((o: any) => (
                  <div
                    key={o.id}
                    className="rounded-xl border p-3 text-xs dark:border-zinc-700"
                  >
                    <b>{o.mercado_pago_order_id ?? "Order pendente"}</b>
                    <p>
                      {o.external_reference} • R$ {Number(o.amount).toFixed(2)}{" "}
                      • {label(o.status)} •{" "}
                      {o.environment}
                    </p>
                    <p>Método: {o.payment_method ?? "—"} • Application ID: {o.mercado_pago_application_id ?? "aguardando"}</p>
                    <p>{o.mercado_pago_application_id === (admin?.expected_application_id ?? "3277123445606852") ? "✅ Credenciais pertencem ao ambiente correto da Vertex Donate" : o.mercado_pago_application_id ? "❌ Credenciais pertencem a outra aplicação/ambiente" : "Validação pendente"}</p>
                    {o.mercado_pago_order_id && (
                      <button
                        className="mt-2 text-blue-500"
                        onClick={() =>
                          void navigator.clipboard.writeText(
                            o.mercado_pago_order_id,
                          )
                        }
                      >
                        Copiar Order ID
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

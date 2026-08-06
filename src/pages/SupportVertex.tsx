import { Check, Copy, Heart, Info, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card } from "../components/ui/Common";
import { DONATION_PIX } from "../config/donation";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard indisponível");
}

export function SupportVertex() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 3000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await copyText(DONATION_PIX.code);
      setCopyError(false);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-500">
          <Heart aria-hidden="true" fill="currentColor" size={24} />
        </div>
        <h2 className="text-3xl font-black">Apoie o projeto</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
          Se você gosta do projeto e quer contribuir com seu desenvolvimento,
          pode apoiar com qualquer valor através do Pix.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-br from-blue-500/10 via-transparent to-violet-500/10 p-5 sm:p-8">
          <div className="mx-auto w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl shadow-blue-500/10 sm:p-6">
            <QRCodeSVG
              aria-label="QR Code Pix para apoiar o projeto"
              bgColor="#ffffff"
              fgColor="#09090b"
              includeMargin
              level="M"
              size={320}
              style={{ width: "100%", height: "auto", display: "block" }}
              title="QR Code Pix"
              value={DONATION_PIX.code}
            />
          </div>

          <div className="mx-auto mt-6 max-w-xl text-center">
            <h3 className="text-lg font-bold">Escaneie com o aplicativo do seu banco</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Este QR Code não possui valor definido. Você escolhe livremente o
              valor da contribuição no momento do envio.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
              <Info aria-hidden="true" size={16} />
              Qualquer valor é bem-vindo.
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <div className="flex items-center gap-2">
            <QrCode aria-hidden="true" className="text-blue-500" size={20} />
            <h3 className="font-bold">Pix Copia e Cola</h3>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="truncate font-mono text-xs text-zinc-600 dark:text-zinc-400" title={DONATION_PIX.code}>
              {DONATION_PIX.code}
            </p>
          </div>
          <Button className="mt-4 min-h-12 w-full" onClick={() => void copy()}>
            {copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
            {copied ? "Código Pix copiado" : "Copiar código Pix"}
          </Button>
          <div aria-live="polite" className="min-h-7 pt-2 text-center text-sm">
            <span className={`text-green-600 transition-opacity duration-300 dark:text-green-400 ${copied ? "opacity-100" : "opacity-0"}`}>
              ✓ Pix copiado
            </span>
            {copyError && <span className="text-red-500">Não foi possível copiar. Selecione o código manualmente.</span>}
          </div>
          <p className="mt-2 text-center text-xs leading-5 text-zinc-500">
            O site apenas exibe o Pix estático e não consulta nem confirma o recebimento da contribuição.
          </p>
        </div>
      </Card>
    </div>
  );
}

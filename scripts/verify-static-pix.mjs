import { readFileSync, existsSync } from "node:fs";
const expected = "00020126460014br.gov.bcb.pix0124andreverasz997@gmail.com5204000053039865802BR5925ANDRE GUSTAVO GOMES VERAS6008BRASILIA62580520SAN2026080602060872950300017br.gov.bcb.brcode01051.0.06304CDAC";
const config = readFileSync("src/config/donation.ts", "utf8");
const page = readFileSync("src/pages/SupportVertex.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");
const checks = {
  "payload exato e único": config.includes(`code: "${expected}"`) && !page.includes(expected),
  "QR usa configuração central": /QRCodeSVG[\s\S]*value=\{DONATION_PIX\.code\}/.test(page),
  "cópia usa payload completo": /copyText\(DONATION_PIX\.code\)/.test(page),
  "sem confirmação simulada": !/pagamento (confirmado|aprovado)|pix recebido|processando pagamento/i.test(page),
  "sem backend bancário": !/supabase\.functions|fetch\(|XMLHttpRequest/.test(page),
  "biblioteca QR local": /qrcode\.react/.test(pkg),
  "funções automatizadas removidas": [
    ["mercado", "pago-create-order"],
    ["mercado", "pago-webhook"],
    ["santan", "der-pix"],
    ["santan", "der-pix-webhook"],
  ].every(parts => !existsSync(`supabase/functions/${parts.join("-")}`)),
};
let failed = false;
for (const [name, ok] of Object.entries(checks)) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);

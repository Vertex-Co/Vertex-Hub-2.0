const email = String(process.argv[2] ?? "").trim().toLowerCase();
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!validEmail.test(email)) {
  console.error("Uso: npm run email:test -- voce@exemplo.com");
  process.exit(1);
}
const apiKey = String(process.env.RESEND_API_KEY ?? "").trim();
const fromEmail = String(process.env.RESEND_FROM_EMAIL ?? "").trim();
const fromName = String(process.env.RESEND_FROM_NAME ?? "Vertex Hub").trim();
const appUrl = String(process.env.APP_URL ?? "").trim();
if (!apiKey || !validEmail.test(fromEmail) || !/^https?:\/\//.test(appUrl)) {
  console.error("RESEND_NOT_CONFIGURED: revise RESEND_API_KEY, RESEND_FROM_EMAIL e APP_URL.");
  process.exit(1);
}
const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "Vertex-Hub-Email-Test/1.0",
    "Idempotency-Key": `manual-test-${crypto.randomUUID()}`,
  },
  body: JSON.stringify({
    from: `${fromName} <${fromEmail}>`,
    to: [email],
    subject: "Teste de e-mail — Vertex Hub",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px"><h1 style="color:#0b1f3a">Vertex Hub</h1><p>O envio transacional está configurado corretamente.</p><p><a href="${appUrl}" style="color:#2563eb">Acessar Vertex Hub</a></p></div>`,
    text: `Vertex Hub: o envio transacional está configurado corretamente. ${appUrl}`,
  }),
});
const result = await response.json().catch(() => ({}));
if (!response.ok || !result.id) {
  console.error(`RESEND_SEND_FAILED (HTTP ${response.status}). Consulte o painel do Resend.`);
  process.exit(1);
}
console.log(`E-mail de teste enviado com sucesso. ID: ${result.id}`);

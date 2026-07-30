import { CircleDollarSign, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button, Input } from "../components/ui/Common";

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (password.length < 6) {
      setMessage({ text: "A senha deve ter pelo menos 6 caracteres.", error: true });
      return;
    }
    setBusy(true);
    const result = mode === "login"
      ? await signIn(email, password)
      : await signUp(name.trim(), email, password);
    setBusy(false);
    if (result.error) {
      const friendly = result.error.includes("Invalid login")
        ? "E-mail ou senha incorretos."
        : result.error;
      setMessage({ text: friendly, error: true });
    } else if (result.confirmationRequired) {
      setMessage({ text: "Cadastro realizado. Confirme o e-mail para entrar." });
    }
  };

  const recover = async () => {
    if (!email) {
      setMessage({ text: "Informe seu e-mail primeiro.", error: true });
      return;
    }
    setBusy(true);
    const result = await resetPassword(email);
    setBusy(false);
    setMessage(result.error
      ? { text: result.error, error: true }
      : { text: "Enviamos as instruções de recuperação para seu e-mail." });
  };

  return <main className="grid min-h-screen bg-zinc-950 text-white lg:grid-cols-[1.1fr_.9fr]">
    <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-violet-700 p-14 lg:flex lg:flex-col">
      <div className="absolute -right-32 -top-32 size-[500px] rounded-full border border-white/15" />
      <div className="absolute -bottom-40 -left-24 size-[520px] rounded-full bg-black/10 blur-2xl" />
      <div className="relative flex items-center gap-3 text-2xl font-black">
        <span className="grid size-12 place-items-center rounded-2xl bg-white text-blue-600"><CircleDollarSign /></span>
        FinTrack
      </div>
      <div className="relative my-auto max-w-xl">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm"><ShieldCheck size={17}/> Seus dados, somente seus</span>
        <h1 className="text-5xl font-black leading-tight">Sua vida financeira em um só lugar.</h1>
        <p className="mt-6 text-lg leading-relaxed text-blue-100">Planeje, acompanhe e alcance seus objetivos com segurança. Cada conta possui um espaço privado e sincronizado.</p>
        <div className="mt-10 grid grid-cols-3 gap-3">
          {["Dados protegidos","Acesso em qualquer lugar","Atualização em tempo real"].map(text =>
            <div key={text} className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-semibold backdrop-blur">{text}</div>)}
        </div>
      </div>
      <p className="relative text-sm text-blue-200">© 2026 FinTrack. Controle com clareza.</p>
    </section>
    <section className="flex items-center justify-center p-5 sm:p-10">
      <div className="w-full max-w-md">
        <div className="mb-9 flex items-center gap-3 text-2xl font-black lg:hidden"><span className="grid size-11 place-items-center rounded-xl bg-blue-600"><CircleDollarSign/></span>FinTrack</div>
        <p className="text-sm font-bold text-blue-500">{mode === "login" ? "BEM-VINDO DE VOLTA" : "COMECE AGORA"}</p>
        <h2 className="mt-2 text-3xl font-black">{mode === "login" ? "Acesse sua conta" : "Crie sua conta"}</h2>
        <p className="mt-2 text-sm text-zinc-400">{mode === "login" ? "Entre para visualizar seus dados financeiros." : "Seus dados ficam privados e disponíveis em qualquer dispositivo."}</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "register" && <label>Nome completo<Input required value={name} onChange={e => setName(e.target.value)} placeholder="Como podemos chamar você?" /></label>}
          <label>E-mail<div className="relative"><Mail className="absolute left-3 top-3.5 text-zinc-500" size={17}/><Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" className="pl-10"/></div></label>
          <label>Senha<div className="relative"><LockKeyhole className="absolute left-3 top-3.5 text-zinc-500" size={17}/><Input required minLength={6} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" className="px-10"/><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-3.5 text-zinc-500">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
          {message && <div className={`rounded-xl border p-3 text-sm ${message.error ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}>{message.text}</div>}
          {mode === "login" && <button type="button" onClick={recover} className="text-sm font-semibold text-blue-400 hover:text-blue-300">Esqueci minha senha</button>}
          <Button disabled={busy} type="submit" className="w-full">{busy ? "Aguarde..." : mode === "login" ? "Entrar na minha conta" : "Criar conta gratuita"}</Button>
        </form>
        <p className="mt-7 text-center text-sm text-zinc-400">{mode === "login" ? "Ainda não tem uma conta?" : "Já possui uma conta?"} <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(null); }} className="font-bold text-blue-400">{mode === "login" ? "Cadastre-se" : "Entrar"}</button></p>
      </div>
    </section>
  </main>;
}

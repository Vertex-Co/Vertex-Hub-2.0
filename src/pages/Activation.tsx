import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { OfficialLogo } from "../components/brand/OfficialLogo";
import { Button, Input } from "../components/ui/Common";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

export function Activation({ onActivated }: { onActivated: () => Promise<void> }) {
  const { signOut } = useAuth();
  const [key, setKey] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const activate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || key.trim().length < 8) return;
    setBusy(true); setMessage(undefined);
    const { error } = await supabase.rpc("consume_activation_key", { p_key: key.trim().toUpperCase() });
    if (error) { setMessage({ text: "A chave é inválida, já foi utilizada ou foi cancelada.", error: true }); setBusy(false); return; }
    setMessage({ text: "Acesso ativado com sucesso. Preparando seu ambiente..." });
    await onActivated(); setBusy(false);
  };
  return <main className="grid min-h-screen place-items-center bg-[#07090d] p-5 text-white"><section className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900/80 p-7 shadow-2xl sm:p-10"><div className="flex items-center gap-3"><OfficialLogo className="size-12 object-contain"/><div><b className="text-xl">Vertex Hub</b><p className="text-xs text-zinc-500">Central de Gestão Digital</p></div></div><div className="mt-8 grid size-12 place-items-center rounded-2xl bg-blue-600/15 text-blue-400"><ShieldCheck/></div><h1 className="mt-4 text-3xl font-black">Ative seu acesso</h1><p className="mt-3 leading-relaxed text-zinc-400">Sua conta foi criada com sucesso. Para acessar o Vertex Hub, informe a chave fornecida pela Vertex.</p><form onSubmit={activate} className="mt-7 space-y-4"><label>Chave de ativação<div className="relative"><KeyRound className="absolute left-3 top-3.5 text-zinc-500" size={18}/><Input autoComplete="one-time-code" value={key} onChange={e=>setKey(e.target.value)} placeholder="VX-XXXXX-XXXXX-XXXXX-XXXXX" className="pl-10 uppercase"/></div></label>{message&&<p aria-live="polite" className={`rounded-xl p-3 text-sm ${message.error?"bg-red-500/10 text-red-400":"bg-emerald-500/10 text-emerald-400"}`}>{message.text}</p>}<Button className="w-full" disabled={busy||key.trim().length<8}>{busy?"Ativando...":"Ativar meu acesso"}</Button></form><p className="mt-5 text-center text-sm text-zinc-500">Não possui uma chave? Entre em contato com a Vertex.</p><button onClick={()=>void signOut()} className="mx-auto mt-5 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><LogOut size={16}/>Sair da conta</button></section></main>;
}

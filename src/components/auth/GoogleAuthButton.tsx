import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
export function GoogleAuthButton({ onError }: { onError:(message:string)=>void }) {
  const { signInWithGoogle } = useAuth(); const [busy, setBusy] = useState(false);
  const submit = async () => { setBusy(true); const result = await signInWithGoogle(); if (result.error) { onError(result.error); setBusy(false); } };
  return <button type="button" disabled={busy} onClick={()=>void submit()} className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-white px-4 font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-60" aria-label="Continuar com Google">
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.5H3.2a10 10 0 0 0 0 9.1L6.5 14Z"/><path fill="#EA4335" d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.5l3.3 2.6A5.8 5.8 0 0 1 12 6Z"/></svg>
    {busy ? "Conectando..." : "Continuar com Google"}
  </button>;
}

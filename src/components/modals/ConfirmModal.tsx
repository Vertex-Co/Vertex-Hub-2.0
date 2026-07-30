import { useState } from "react";
import { Button, Modal } from "../ui/Common";
export function ConfirmModal({ open, title, description, confirmLabel = "Confirmar", danger = false, onClose, onConfirm }: { open:boolean; title:string; description:string; confirmLabel?:string; danger?:boolean; onClose:()=>void; onConfirm:()=>void|Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const confirm = async () => { setBusy(true); await onConfirm(); setBusy(false); onClose(); };
  return <Modal title={title} onClose={onClose}><p className="text-sm leading-relaxed text-zinc-500">{description}</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button><Button variant={danger ? "danger" : "primary"} disabled={busy} onClick={()=>void confirm()}>{busy ? "Aguarde..." : confirmLabel}</Button></div></Modal>;
}

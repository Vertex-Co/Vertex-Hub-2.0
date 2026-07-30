import { useEffect, useState } from "react";
import { Button, Input, Modal } from "../ui/Common";
export function AmountModal({ open, title, description, initialValue = 0, allowZero = false, onClose, onConfirm }: { open:boolean; title:string; description:string; initialValue?:number; allowZero?:boolean; onClose:()=>void; onConfirm:(value:number)=>void|Promise<void> }) {
  const [value, setValue] = useState(String(initialValue || ""));
  const [busy, setBusy] = useState(false);
  useEffect(() => setValue(String(initialValue || "")), [initialValue, open]);
  if (!open) return null;
  const amount = Number(value); const valid = Number.isFinite(amount) && (allowZero ? amount >= 0 : amount > 0);
  const confirm = async () => { if (!valid) return; setBusy(true); await onConfirm(amount); setBusy(false); onClose(); };
  return <Modal title={title} onClose={onClose}><p className="mb-4 text-sm text-zinc-500">{description}</p><label>Valor (R$)<Input autoFocus type="number" min={allowZero ? 0 : 0.01} step="0.01" value={value} onChange={event=>setValue(event.target.value)}/></label>{!valid&&value&&<p className="mt-2 text-sm text-red-500">Informe um valor válido.</p>}<div className="mt-6 flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy||!valid} onClick={()=>void confirm()}>{busy ? "Salvando..." : "Confirmar"}</Button></div></Modal>;
}

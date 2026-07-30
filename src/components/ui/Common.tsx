import { X } from "lucide-react";
import { useEffect, useRef } from "react";
export const Card = ({children,className=""}:{children:React.ReactNode,className?:string}) =>
  <div className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>{children}</div>;
export const Button = ({children,className="",variant="primary",...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"danger"}) =>
  <button className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50 ${variant==="primary"?"bg-blue-600 text-white hover:bg-blue-500":variant==="danger"?"bg-red-500/10 text-red-500 hover:bg-red-500/20":"border border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"} ${className}`} {...props}>{children}</button>;
export const Input = (props:React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-800 ${props.className??""}`}/>;
export const Select = (props:React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 ${props.className??""}`}/>;
export function Modal({title,onClose,children}:{title:string,onClose:()=>void,children:React.ReactNode}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", keydown); panel.current?.focus();
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title" className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl outline-none dark:bg-zinc-900 sm:max-w-xl sm:rounded-3xl sm:p-6">
      <div className="mb-5 flex items-center justify-between"><h2 id="modal-title" className="text-lg font-bold">{title}</h2><button aria-label="Fechar" onClick={onClose} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={20}/></button></div>{children}
    </div></div>;
}

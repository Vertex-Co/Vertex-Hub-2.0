import { BarChart3, Bell, ChevronDown, CircleDollarSign, Flag, LayoutDashboard, LogOut, Menu, Moon, PiggyBank, Plus, ReceiptText, Search, Settings, Sun, X } from "lucide-react";
import { useState } from "react";
import { useFinance } from "../../contexts/FinanceContext";
import { useAuth } from "../../contexts/AuthContext";
import type { Page } from "../../types";
import { Button } from "../ui/Common";
const nav:[Page,string,React.ElementType][]=[["dashboard","Visão geral",LayoutDashboard],["transactions","Transações",ReceiptText],["reports","Relatórios",BarChart3],["budgets","Orçamentos",PiggyBank],["goals","Metas",Flag],["settings","Configurações",Settings]];
export function AppShell({page,setPage,onNew,children}:{page:Page,setPage:(p:Page)=>void,onNew:()=>void,children:React.ReactNode}) {
 const {dark,setDark,toasts,loading}=useFinance();const {user,signOut}=useAuth();const [mobile,setMobile]=useState(false);
 const fullName=String(user?.user_metadata.full_name||user?.email?.split("@")[0]||"Usuário");const initial=fullName.charAt(0).toUpperCase();
 const go=(p:Page)=>{setPage(p);setMobile(false)};
 return <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
  <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-zinc-200 bg-white p-5 transition-transform dark:border-zinc-800 dark:bg-zinc-950 lg:translate-x-0 ${mobile?"translate-x-0":"-translate-x-full"}`}>
   <div className="mb-9 flex items-center justify-between"><button onClick={()=>go("dashboard")} className="flex items-center gap-3 text-xl font-black"><span className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white"><CircleDollarSign/></span>FinTrack</button><button className="lg:hidden" onClick={()=>setMobile(false)}><X/></button></div>
   <nav className="space-y-1">{nav.map(([id,label,Icon])=><button key={id} onClick={()=>go(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${page===id?"bg-blue-600 text-white shadow-lg shadow-blue-600/20":"text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}><Icon size={19}/>{label}</button>)}</nav>
   <div className="absolute bottom-5 left-5 right-5"><button onClick={()=>setDark(!dark)} className="mb-4 flex w-full items-center gap-3 rounded-xl bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{dark?<Sun size={18}/>:<Moon size={18}/>}Tema {dark?"claro":"escuro"}</button><div className="flex items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"><div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 font-bold text-white">{initial}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{fullName}</p><p className="truncate text-xs text-zinc-500">{user?.email}</p></div><button aria-label="Sair" title="Sair da conta" onClick={()=>void signOut()}><LogOut size={18} className="text-zinc-400 hover:text-red-500"/></button></div></div>
  </aside>
  {mobile&&<button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={()=>setMobile(false)}/>}
  <main className="min-h-screen lg:pl-64"><header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-zinc-100/85 px-4 py-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85 sm:px-7"><div className="mx-auto flex max-w-[1500px] items-center gap-3">
   <button className="rounded-xl border p-2.5 lg:hidden dark:border-zinc-700" onClick={()=>setMobile(true)}><Menu/></button><div className="mr-auto hidden sm:block"><h1 className="text-lg font-bold">Olá, {fullName.split(" ")[0]} <span>👋</span></h1><p className="text-xs text-zinc-500">{loading?"Sincronizando seus dados...":"Acompanhe sua vida financeira"}</p></div>
   <label className="relative hidden md:block"><Search className="absolute left-3 top-2.5 text-zinc-400" size={18}/><input className="h-10 w-52 rounded-xl border bg-white pl-10 text-sm dark:border-zinc-700 dark:bg-zinc-900" placeholder="Pesquisar"/></label>
   <button className="relative rounded-xl border bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-900"><Bell size={19}/><i className="absolute right-2 top-2 size-2 rounded-full bg-red-500"/></button><Button onClick={onNew}><Plus size={18}/><span className="hidden sm:inline">Nova transação</span></Button>
  </div></header><div className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-7">{children}</div></main>
  <div className="fixed right-4 top-20 z-[60] space-y-2">{toasts.map(t=><div key={t.id} className={`rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${t.kind==="error"?"bg-red-500":"bg-emerald-500"}`}>{t.message}</div>)}</div>
  <nav className="fixed bottom-0 left-0 right-0 z-20 flex justify-around border-t bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">{nav.slice(0,5).map(([id,label,Icon])=><button key={id} onClick={()=>go(id)} className={`flex min-w-14 flex-col items-center gap-1 rounded-lg p-1 text-[10px] ${page===id?"text-blue-500":"text-zinc-500"}`}><Icon size={20}/>{label.split(" ")[0]}</button>)}</nav>
 </div>;
}

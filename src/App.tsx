import { useState } from "react";
import { TransactionModal } from "./components/forms/TransactionModal";
import { AppShell } from "./components/layout/AppShell";
import { FinanceProvider } from "./contexts/FinanceContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Budgets } from "./pages/Budgets";
import { Dashboard } from "./pages/Dashboard";
import { Goals } from "./pages/Goals";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Transactions } from "./pages/Transactions";
import { AuthPage } from "./pages/Auth";
import type { Page, Transaction } from "./types";
import { isSupabaseConfigured } from "./services/supabase";
function FinanceApp(){const [page,setPage]=useState<Page>("dashboard"),[modal,setModal]=useState(false),[editing,setEditing]=useState<Transaction|undefined>();const edit=(t:Transaction)=>{setEditing(t);setModal(true)};const content={dashboard:<Dashboard onEdit={edit} setPage={()=>setPage("transactions")}/>,transactions:<Transactions onEdit={edit}/>,reports:<Reports/>,budgets:<Budgets/>,goals:<Goals/>,settings:<Settings/>}[page];return <AppShell page={page} setPage={setPage} onNew={()=>{setEditing(undefined);setModal(true)}}>{content}{modal&&<TransactionModal transaction={editing} onClose={()=>{setModal(false);setEditing(undefined)}}/>}</AppShell>}
function ConfigurationRequired(){return <main className="grid min-h-screen place-items-center bg-zinc-950 p-5 text-white"><section className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-7 shadow-2xl"><span className="text-sm font-bold text-blue-400">VERTEX HUB</span><h1 className="mt-2 text-3xl font-black">Configuração necessária</h1><p className="mt-3 leading-relaxed text-zinc-400">A conexão com o Supabase ainda não foi configurada neste deploy. Adicione as variáveis abaixo nas configurações do projeto na Vercel e faça um novo deploy.</p><pre className="mt-6 overflow-x-auto rounded-2xl bg-zinc-950 p-4 text-sm text-blue-200">VITE_SUPABASE_URL{"\n"}VITE_SUPABASE_PUBLISHABLE_KEY</pre><p className="mt-5 text-sm text-zinc-500">Use somente a chave pública Publishable ou Anon. Nunca use a chave service_role.</p></section></main>}
function AppGate(){const {user,loading}=useAuth();if(!isSupabaseConfigured)return <ConfigurationRequired/>;if(loading)return <div className="grid min-h-screen place-items-center bg-zinc-950 text-white"><div className="text-center"><div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"/><b>Vertex Hub</b><p className="text-sm text-zinc-400">Central de Gestão Digital • Carregando sua conta...</p></div></div>;return user?<FinanceProvider><FinanceApp/></FinanceProvider>:<AuthPage/>}
export default function App(){return <AuthProvider><AppGate/></AuthProvider>}

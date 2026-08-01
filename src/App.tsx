import { useState } from "react";
import { TransactionModal } from "./components/forms/TransactionModal";
import { AppShell } from "./components/layout/AppShell";
import { AuthProvider,useAuth } from "./contexts/AuthContext";
import { CompanyProvider,useCompany } from "./contexts/CompanyContext";
import { FinanceProvider } from "./contexts/FinanceContext";
import { AuthPage } from "./pages/Auth";
import { Budgets } from "./pages/Budgets";
import { Companies } from "./pages/Companies";
import { Dashboard } from "./pages/Dashboard";
import { Goals } from "./pages/Goals";
import { Onboarding } from "./pages/Onboarding";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Transactions } from "./pages/Transactions";
import { isSupabaseConfigured } from "./services/supabase";
import type { Page,Transaction } from "./types";
function FinanceApp(){const[page,setPage]=useState<Page>("dashboard"),[modal,setModal]=useState(false),[editing,setEditing]=useState<Transaction>();const edit=(t:Transaction)=>{setEditing(t);setModal(true)};const content:Partial<Record<Page,React.ReactNode>>={dashboard:<Dashboard onEdit={edit} setPage={()=>setPage("transactions")}/>,transactions:<Transactions onEdit={edit}/>,reports:<Reports/>,budgets:<Budgets/>,goals:<Goals/>,settings:<Settings/>,companies:<Companies onOpenDashboard={()=>setPage("dashboard")}/>};return <AppShell page={page} setPage={setPage} onNew={()=>{setEditing(undefined);setModal(true)}}>{content[page]}{modal&&<TransactionModal transaction={editing} onClose={()=>setModal(false)}/>}</AppShell>}
function Loading(){return <div className="grid min-h-screen place-items-center bg-zinc-950 text-white"><div className="text-center"><div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"/><b>Vertex Hub</b><p className="text-sm text-zinc-400">Carregando seu ambiente...</p></div></div>}
function ConfigurationRequired(){return <main className="grid min-h-screen place-items-center bg-zinc-950 p-5 text-white"><section className="max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-7"><b className="text-blue-400">VERTEX HUB</b><h1 className="mt-2 text-3xl font-black">Configuração necessária</h1><p className="mt-3 text-zinc-400">Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY conforme o manual.</p></section></main>}
function CompanyGate(){const{profile,loading}=useCompany();if(loading)return <Loading/>;return profile?.onboardingCompleted?<FinanceProvider><FinanceApp/></FinanceProvider>:<Onboarding/>}
function AppGate(){const{user,loading}=useAuth();if(!isSupabaseConfigured)return <ConfigurationRequired/>;if(loading)return <Loading/>;return user?<CompanyProvider><CompanyGate/></CompanyProvider>:<AuthPage/>}
export default function App(){return <AuthProvider><AppGate/></AuthProvider>}

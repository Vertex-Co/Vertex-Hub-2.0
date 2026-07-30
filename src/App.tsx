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
function FinanceApp(){const [page,setPage]=useState<Page>("dashboard"),[modal,setModal]=useState(false),[editing,setEditing]=useState<Transaction|undefined>();const edit=(t:Transaction)=>{setEditing(t);setModal(true)};const content={dashboard:<Dashboard onEdit={edit} setPage={()=>setPage("transactions")}/>,transactions:<Transactions onEdit={edit}/>,reports:<Reports/>,budgets:<Budgets/>,goals:<Goals/>,settings:<Settings/>}[page];return <AppShell page={page} setPage={setPage} onNew={()=>{setEditing(undefined);setModal(true)}}>{content}{modal&&<TransactionModal transaction={editing} onClose={()=>{setModal(false);setEditing(undefined)}}/>}</AppShell>}
function AppGate(){const {user,loading}=useAuth();if(loading)return <div className="grid min-h-screen place-items-center bg-zinc-950 text-white"><div className="text-center"><div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"/><b>Vertex Hub</b><p className="text-sm text-zinc-400">Central de Gestão Digital • Carregando sua conta...</p></div></div>;return user?<FinanceProvider><FinanceApp/></FinanceProvider>:<AuthPage/>}
export default function App(){return <AuthProvider><AppGate/></AuthProvider>}

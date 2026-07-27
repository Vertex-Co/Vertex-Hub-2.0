import { useState } from "react";
import { TransactionModal } from "./components/forms/TransactionModal";
import { AppShell } from "./components/layout/AppShell";
import { FinanceProvider } from "./contexts/FinanceContext";
import { Budgets } from "./pages/Budgets";
import { Dashboard } from "./pages/Dashboard";
import { Goals } from "./pages/Goals";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Transactions } from "./pages/Transactions";
import type { Page, Transaction } from "./types";
function FinanceApp(){const [page,setPage]=useState<Page>("dashboard"),[modal,setModal]=useState(false),[editing,setEditing]=useState<Transaction|undefined>();const edit=(t:Transaction)=>{setEditing(t);setModal(true)};const content={dashboard:<Dashboard onEdit={edit} setPage={()=>setPage("transactions")}/>,transactions:<Transactions onEdit={edit}/>,reports:<Reports/>,budgets:<Budgets/>,goals:<Goals/>,settings:<Settings/>}[page];return <AppShell page={page} setPage={setPage} onNew={()=>{setEditing(undefined);setModal(true)}}>{content}{modal&&<TransactionModal transaction={editing} onClose={()=>{setModal(false);setEditing(undefined)}}/>}</AppShell>}
export default function App(){return <FinanceProvider><FinanceApp/></FinanceProvider>}

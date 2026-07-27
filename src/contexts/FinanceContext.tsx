import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { demoGoals, demoTransactions } from "../data/demo";
import { loadLocal, saveLocal } from "../storage/local";
import type { Goal, Transaction } from "../types";
import { uid } from "../utils/format";

type Toast = { id: string; message: string; kind: "success" | "error" };
type FinanceContextValue = {
  transactions: Transaction[]; goals: Goal[]; budget: number; dark: boolean; toasts: Toast[];
  saveTransaction: (data: Omit<Transaction,"id"|"createdAt">, id?: string) => void;
  deleteTransaction: (id: string) => void; duplicateTransaction: (id: string) => void;
  saveGoal: (data: Omit<Goal,"id"|"createdAt">, id?: string) => void;
  deleteGoal: (id: string) => void; addToGoal: (id: string, amount: number) => void;
  setBudget: (value:number) => void; setDark: (value:boolean) => void;
  resetData: () => void; notify: (message:string, kind?:Toast["kind"]) => void;
};
const FinanceContext = createContext<FinanceContextValue | null>(null);
export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions,setTransactions] = useState(() => loadLocal("fintrack-transactions",demoTransactions));
  const [goals,setGoals] = useState(() => loadLocal("fintrack-goals",demoGoals));
  const [budget,setBudgetState] = useState(() => loadLocal("fintrack-budget",6000));
  const [dark,setDarkState] = useState(() => loadLocal("fintrack-dark",true));
  const [toasts,setToasts] = useState<Toast[]>([]);
  useEffect(() => saveLocal("fintrack-transactions",transactions),[transactions]);
  useEffect(() => saveLocal("fintrack-goals",goals),[goals]);
  useEffect(() => { saveLocal("fintrack-dark",dark); document.documentElement.classList.toggle("dark",dark); },[dark]);
  useEffect(() => saveLocal("fintrack-budget",budget),[budget]);
  const notify = (message:string,kind:Toast["kind"]="success") => {
    const id=uid(); setToasts(t=>[...t,{id,message,kind}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2600);
  };
  const value = useMemo<FinanceContextValue>(() => ({
    transactions,goals,budget,dark,toasts,notify,
    saveTransaction:(data,id)=>{setTransactions(t=>id?t.map(x=>x.id===id?{...x,...data}:x):[{...data,id:uid(),createdAt:new Date().toISOString()},...t]);notify(id?"Transação atualizada":"Transação adicionada");},
    deleteTransaction:(id)=>{setTransactions(t=>t.filter(x=>x.id!==id));notify("Transação excluída");},
    duplicateTransaction:(id)=>{setTransactions(t=>{const x=t.find(y=>y.id===id);return x?[{...x,id:uid(),description:`${x.description} (cópia)`,createdAt:new Date().toISOString()},...t]:t});notify("Transação duplicada");},
    saveGoal:(data,id)=>{setGoals(g=>id?g.map(x=>x.id===id?{...x,...data}:x):[...g,{...data,id:uid(),createdAt:new Date().toISOString()}]);notify(id?"Meta atualizada":"Meta criada");},
    deleteGoal:(id)=>{setGoals(g=>g.filter(x=>x.id!==id));notify("Meta excluída");},
    addToGoal:(id,amount)=>{setGoals(g=>g.map(x=>x.id===id?{...x,currentAmount:Math.min(x.targetAmount,x.currentAmount+amount)}:x));notify("Valor adicionado à meta");},
    setBudget:(value)=>{setBudgetState(value);notify("Orçamento atualizado");},setDark:setDarkState,
    resetData:()=>{setTransactions([]);setGoals([]);setBudgetState(6000);notify("Dados locais apagados");}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }),[transactions,goals,budget,dark,toasts]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
export const useFinance = () => { const value=useContext(FinanceContext); if(!value) throw new Error("FinanceProvider ausente"); return value; };

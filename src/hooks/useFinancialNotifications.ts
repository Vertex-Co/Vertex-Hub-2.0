import { useMemo } from "react";
import type { FinancialNotification, Goal, Transaction } from "../types";
import { parseLocalDate } from "../utils/dateRanges";
export function useFinancialNotifications(transactions:Transaction[],goals:Goal[],budget:number) {
 return useMemo(()=>{
  const items:FinancialNotification[]=[];const now=new Date(),month=now.getMonth(),year=now.getFullYear();
  const monthTx=transactions.filter(t=>{const d=parseLocalDate(t.date);return d.getMonth()===month&&d.getFullYear()===year});
  const income=monthTx.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),expense=monthTx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  if(budget>0){const pct=expense/budget*100;if(pct>=100)items.push({id:"budget-over",title:"Orçamento ultrapassado",description:`As despesas atingiram ${pct.toFixed(0)}% do limite.`,page:"budgets",level:"danger"});else if(pct>=90)items.push({id:"budget-90",title:"Orçamento próximo do limite",description:`Você utilizou ${pct.toFixed(0)}% do orçamento.`,page:"budgets",level:"danger"});else if(pct>=70)items.push({id:"budget-70",title:"Atenção ao orçamento",description:`Você utilizou ${pct.toFixed(0)}% do orçamento.`,page:"budgets",level:"warning"});}
  const pending=transactions.filter(t=>t.status==="pending");if(pending.length)items.push({id:"pending",title:"Transações pendentes",description:`${pending.length} movimentação(ões) aguardando conclusão.`,page:"transactions",level:"warning"});
  if(expense>income&&monthTx.length)items.push({id:"negative",title:"Despesas maiores que receitas",description:"Revise seu fluxo financeiro deste mês.",page:"reports",level:"danger"});
  goals.forEach(goal=>{const days=Math.ceil((parseLocalDate(goal.deadline).getTime()-now.getTime())/86400000);if(goal.currentAmount>=goal.targetAmount)items.push({id:`goal-done-${goal.id}`,title:"Meta concluída",description:goal.name,page:"goals",level:"info"});else if(days<0)items.push({id:`goal-late-${goal.id}`,title:"Meta atrasada",description:goal.name,page:"goals",level:"danger"});else if(days<=7)items.push({id:`goal-soon-${goal.id}`,title:"Meta próxima do prazo",description:`${goal.name}: ${days} dia(s).`,page:"goals",level:"warning"});});
  return items;
 },[transactions,goals,budget]);
}

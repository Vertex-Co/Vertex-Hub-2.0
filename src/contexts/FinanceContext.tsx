import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useHiddenValuesState } from "../hooks/useHiddenValues";
import { supabase } from "../services/supabase";
import type { Goal, Transaction } from "../types";
import { normalizeLocalDateValue } from "../utils/dateRanges";
import { uid } from "../utils/format";
import { useAuth } from "./AuthContext";

type Toast = { id: string; message: string; kind: "success" | "error" };
type SaveResult = { ok: true } | { ok: false; error: string };
type TransactionInput = Omit<Transaction, "id" | "createdAt">;
type GoalInput = Omit<Goal, "id" | "createdAt">;
type FinanceContextValue = {
  transactions: Transaction[]; goals: Goal[]; budget: number; dark: boolean; hiddenValues: boolean;
  toasts: Toast[]; loading: boolean;
  saveTransaction: (data: TransactionInput, id?: string) => Promise<SaveResult>;
  deleteTransaction: (id: string) => Promise<void>; duplicateTransaction: (id: string) => Promise<void>;
  saveGoal: (data: GoalInput, id?: string) => Promise<void>; deleteGoal: (id: string) => Promise<void>;
  addToGoal: (id: string, amount: number) => Promise<void>; setBudget: (value: number) => Promise<void>;
  setDark: (value: boolean) => void; setHiddenValues: (value: boolean) => void;
  resetData: () => Promise<void>; notify: (message: string, kind?: Toast["kind"]) => void;
};
type TransactionRow = { id:string; description:string; amount:number|string; type:Transaction["type"]; category:string; date:string; payment_method:string; status:Transaction["status"]; notes:string|null; created_at:string };
type GoalRow = { id:string; name:string; target_amount:number|string; current_amount:number|string; deadline:string; created_at:string };
const toTransaction = (row: TransactionRow): Transaction => ({ id:row.id, description:row.description, amount:Number(row.amount), type:row.type, category:row.category, date:normalizeLocalDateValue(row.date), paymentMethod:row.payment_method, status:row.status, notes:row.notes ?? undefined, createdAt:row.created_at });
const toGoal = (row: GoalRow): Goal => ({ id:row.id, name:row.name, targetAmount:Number(row.target_amount), currentAmount:Number(row.current_amount), deadline:row.deadline, createdAt:row.created_at });
const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const userFullName = String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budget, setBudgetState] = useState(0);
  const [dark, setDarkState] = useState(() => localStorage.getItem("vertex-hub-dark") !== "false");
  const { hidden: hiddenValues, setHidden: setHiddenValues } = useHiddenValuesState();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const notify = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = uid(); setToasts(current => [...current, { id, message, kind }]);
    setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), 2800);
  }, []);
  const fail = useCallback((message: string) => {
    if (import.meta.env.DEV) console.error("[Vertex Hub]", message);
    notify("Não foi possível concluir a operação. Tente novamente.", "error");
  }, [notify]);

  const reload = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const [txResult, goalResult, settingsResult] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending:false }),
      supabase.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending:false }),
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    const error = txResult.error ?? goalResult.error ?? settingsResult.error;
    if (error) { fail(error.message); setLoading(false); return; }
    if (!settingsResult.data) {
      const { error: insertError } = await supabase.from("user_settings").insert({ user_id:userId, full_name:userFullName, monthly_budget:0, demo_seeded:false });
      if (insertError) fail(insertError.message);
    } else setBudgetState(Number(settingsResult.data.monthly_budget ?? 0));
    setTransactions(((txResult.data ?? []) as TransactionRow[]).map(toTransaction));
    setGoals(((goalResult.data ?? []) as GoalRow[]).map(toGoal));
    setLoading(false);
  }, [userId, userFullName, fail]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { localStorage.setItem("vertex-hub-dark", String(dark)); document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const value = useMemo<FinanceContextValue>(() => ({
    transactions, goals, budget, dark, hiddenValues, setHiddenValues, toasts, loading, notify,
    saveTransaction: async (data, id) => {
      if (!user) return { ok:false, error:"Sua sessão expirou. Entre novamente para salvar a transação." };
      try {
        const row = { user_id:user.id, description:data.description.trim(), amount:data.amount, type:data.type, category:data.category, date:data.date, payment_method:data.paymentMethod, status:data.status, notes:data.notes?.trim() || null };
        const query = id ? supabase.from("transactions").update(row).eq("id", id).eq("user_id", user.id).select("*").single() : supabase.from("transactions").insert(row).select("*").single();
        const { data:saved, error } = await query;
        if (error) {
          if (import.meta.env.DEV) console.error("[Vertex Hub] Falha ao salvar transação", error);
          const message = error.code === "42501"
            ? "Sua conta não tem permissão para gravar transações. Verifique as políticas do Supabase."
            : error.code === "42P01" || error.code === "PGRST205"
              ? "A tabela de transações ainda não foi configurada no Supabase."
              : "Não foi possível salvar a transação. Tente novamente.";
          notify(message, "error");
          return { ok:false, error:message };
        }
        if (!saved) {
          const message = "O servidor não retornou a transação salva. Tente novamente.";
          notify(message, "error");
          return { ok:false, error:message };
        }
        const item = toTransaction(saved as TransactionRow); setTransactions(current => id ? current.map(entry => entry.id === id ? item : entry) : [item, ...current]);
        notify(id ? "Transação atualizada" : "Transação criada");
        return { ok:true };
      } catch (error) {
        if (import.meta.env.DEV) console.error("[Vertex Hub] Erro de rede ao salvar transação", error);
        const message = "Falha de conexão ao salvar. Verifique sua internet e tente novamente.";
        notify(message, "error");
        return { ok:false, error:message };
      }
    },
    deleteTransaction: async id => {
      if (!user) return; const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id); if (error) return fail(error.message);
      setTransactions(current => current.filter(item => item.id !== id)); notify("Transação excluída");
    },
    duplicateTransaction: async id => {
      const source = transactions.find(item => item.id === id); if (!source || !user) return;
      const { id:_id, createdAt:_createdAt, paymentMethod, ...item } = source;
      const { data, error } = await supabase.from("transactions").insert({ user_id:user.id, ...item, description:`${item.description} (cópia)`, payment_method:paymentMethod }).select("*").single();
      if (error) return fail(error.message); setTransactions(current => [toTransaction(data as TransactionRow), ...current]); notify("Transação duplicada");
    },
    saveGoal: async (data, id) => {
      if (!user) return; const row = { user_id:user.id, name:data.name, target_amount:data.targetAmount, current_amount:data.currentAmount, deadline:data.deadline };
      const query = id ? supabase.from("goals").update(row).eq("id", id).eq("user_id", user.id).select("*").single() : supabase.from("goals").insert(row).select("*").single();
      const { data:saved, error } = await query; if (error) return fail(error.message); const item = toGoal(saved as GoalRow);
      setGoals(current => id ? current.map(entry => entry.id === id ? item : entry) : [item, ...current]); notify(id ? "Meta atualizada" : "Meta criada");
    },
    deleteGoal: async id => { if (!user) return; const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id); if (error) return fail(error.message); setGoals(current => current.filter(item => item.id !== id)); notify("Meta excluída"); },
    addToGoal: async (id, amount) => {
      const goal = goals.find(item => item.id === id); if (!goal || !user) return; const currentAmount = Math.min(goal.targetAmount, goal.currentAmount + amount);
      const { error } = await supabase.from("goals").update({ current_amount:currentAmount }).eq("id", id).eq("user_id", user.id); if (error) return fail(error.message);
      setGoals(current => current.map(item => item.id === id ? { ...item, currentAmount } : item)); notify("Valor adicionado à meta");
    },
    setBudget: async amount => { if (!user || amount < 0) return; const { error } = await supabase.from("user_settings").update({ monthly_budget:amount, updated_at:new Date().toISOString() }).eq("user_id", user.id); if (error) return fail(error.message); setBudgetState(amount); notify("Orçamento atualizado"); },
    setDark:setDarkState,
    resetData: async () => {
      if (!user) return; const [tx, goal] = await Promise.all([supabase.from("transactions").delete().eq("user_id", user.id), supabase.from("goals").delete().eq("user_id", user.id)]);
      const error = tx.error ?? goal.error; if (error) return fail(error.message); setTransactions([]); setGoals([]); notify("Seus dados financeiros foram apagados");
    },
  }), [transactions, goals, budget, dark, hiddenValues, setHiddenValues, toasts, loading, notify, fail, user]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
export const useFinance = () => { const value = useContext(FinanceContext); if (!value) throw new Error("FinanceProvider ausente"); return value; };

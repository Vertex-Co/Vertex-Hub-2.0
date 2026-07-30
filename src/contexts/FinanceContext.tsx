import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { demoGoals, demoTransactions } from "../data/demo";
import { supabase } from "../services/supabase";
import type { Goal, Transaction } from "../types";
import { uid } from "../utils/format";
import { useAuth } from "./AuthContext";

type Toast = { id: string; message: string; kind: "success" | "error" };
type TransactionInput = Omit<Transaction, "id" | "createdAt">;
type GoalInput = Omit<Goal, "id" | "createdAt">;
type FinanceContextValue = {
  transactions: Transaction[]; goals: Goal[]; budget: number; dark: boolean;
  toasts: Toast[]; loading: boolean;
  saveTransaction: (data: TransactionInput, id?: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  duplicateTransaction: (id: string) => Promise<void>;
  saveGoal: (data: GoalInput, id?: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addToGoal: (id: string, amount: number) => Promise<void>;
  setBudget: (value: number) => Promise<void>;
  setDark: (value: boolean) => void;
  resetData: () => Promise<void>;
  notify: (message: string, kind?: Toast["kind"]) => void;
};

type TransactionRow = {
  id: string; description: string; amount: number | string; type: Transaction["type"];
  category: string; date: string; payment_method: string; status: Transaction["status"];
  notes: string | null; created_at: string;
};
type GoalRow = {
  id: string; name: string; target_amount: number | string; current_amount: number | string;
  deadline: string; created_at: string;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);
const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id, description: row.description, amount: Number(row.amount), type: row.type,
  category: row.category, date: row.date, paymentMethod: row.payment_method,
  status: row.status, notes: row.notes ?? undefined, createdAt: row.created_at,
});
const toGoal = (row: GoalRow): Goal => ({
  id: row.id, name: row.name, targetAmount: Number(row.target_amount),
  currentAmount: Number(row.current_amount), deadline: row.deadline, createdAt: row.created_at,
});

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budget, setBudgetState] = useState(6000);
  const [dark, setDarkState] = useState(() => localStorage.getItem("fintrack-dark") !== "false");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);

  const notify = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = uid();
    setToasts(current => [...current, { id, message, kind }]);
    setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), 2800);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [transactionsResult, goalsResult, settingsResult] = await Promise.all([
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    const error = transactionsResult.error ?? goalsResult.error ?? settingsResult.error;
    if (error) {
      notify(error.message.includes("does not exist")
        ? "O banco ainda precisa da migração SQL do FinTrack."
        : `Não foi possível carregar seus dados: ${error.message}`, "error");
      setLoading(false);
      return;
    }

    let rows = (transactionsResult.data ?? []) as TransactionRow[];
    let goalRows = (goalsResult.data ?? []) as GoalRow[];
    if (!settingsResult.data) {
      const fullName = String(user.user_metadata.full_name ?? "");
      const { error: settingsError } = await supabase.from("user_settings").insert({
        user_id: user.id, full_name: fullName, monthly_budget: 6000, demo_seeded: true,
      });
      if (!settingsError) {
        const demoTransactionRows = demoTransactions.map(({ id: _id, createdAt: _createdAt, paymentMethod, ...item }) => ({
          user_id: user.id, ...item, payment_method: paymentMethod,
        }));
        const demoGoalRows = demoGoals.map(({ id: _id, createdAt: _createdAt, targetAmount, currentAmount, ...item }) => ({
          user_id: user.id, ...item, target_amount: targetAmount, current_amount: currentAmount,
        }));
        const [seedTransactions, seedGoals] = await Promise.all([
          supabase.from("transactions").insert(demoTransactionRows).select("*"),
          supabase.from("goals").insert(demoGoalRows).select("*"),
        ]);
        rows = (seedTransactions.data ?? []) as TransactionRow[];
        goalRows = (seedGoals.data ?? []) as GoalRow[];
      }
    } else {
      setBudgetState(Number(settingsResult.data.monthly_budget));
    }
    setTransactions(rows.map(toTransaction));
    setGoals(goalRows.map(toGoal));
    setLoading(false);
  }, [user, notify]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    localStorage.setItem("fintrack-dark", String(dark));
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const fail = (message: string) => notify(message, "error");
  const value = useMemo<FinanceContextValue>(() => ({
    transactions, goals, budget, dark, toasts, loading, notify,
    saveTransaction: async (data, id) => {
      if (!user) return;
      const row = {
        user_id: user.id, description: data.description, amount: data.amount, type: data.type,
        category: data.category, date: data.date, payment_method: data.paymentMethod,
        status: data.status, notes: data.notes || null,
      };
      const query = id
        ? supabase.from("transactions").update(row).eq("id", id).select("*").single()
        : supabase.from("transactions").insert(row).select("*").single();
      const { data: saved, error } = await query;
      if (error) return fail(error.message);
      const item = toTransaction(saved as TransactionRow);
      setTransactions(current => id ? current.map(entry => entry.id === id ? item : entry) : [item, ...current]);
      notify(id ? "Transação atualizada" : "Transação adicionada");
    },
    deleteTransaction: async id => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) return fail(error.message);
      setTransactions(current => current.filter(item => item.id !== id));
      notify("Transação excluída");
    },
    duplicateTransaction: async id => {
      const source = transactions.find(item => item.id === id);
      if (!source || !user) return;
      const { id: _id, createdAt: _createdAt, paymentMethod, ...item } = source;
      const { data, error } = await supabase.from("transactions").insert({
        user_id: user.id, ...item, description: `${item.description} (cópia)`, payment_method: paymentMethod,
      }).select("*").single();
      if (error) return fail(error.message);
      setTransactions(current => [toTransaction(data as TransactionRow), ...current]);
      notify("Transação duplicada");
    },
    saveGoal: async (data, id) => {
      if (!user) return;
      const row = { user_id: user.id, name: data.name, target_amount: data.targetAmount, current_amount: data.currentAmount, deadline: data.deadline };
      const query = id
        ? supabase.from("goals").update(row).eq("id", id).select("*").single()
        : supabase.from("goals").insert(row).select("*").single();
      const { data: saved, error } = await query;
      if (error) return fail(error.message);
      const item = toGoal(saved as GoalRow);
      setGoals(current => id ? current.map(entry => entry.id === id ? item : entry) : [item, ...current]);
      notify(id ? "Meta atualizada" : "Meta criada");
    },
    deleteGoal: async id => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) return fail(error.message);
      setGoals(current => current.filter(item => item.id !== id));
      notify("Meta excluída");
    },
    addToGoal: async (id, amount) => {
      const goal = goals.find(item => item.id === id);
      if (!goal) return;
      const currentAmount = Math.min(goal.targetAmount, goal.currentAmount + amount);
      const { error } = await supabase.from("goals").update({ current_amount: currentAmount }).eq("id", id);
      if (error) return fail(error.message);
      setGoals(current => current.map(item => item.id === id ? { ...item, currentAmount } : item));
      notify("Valor adicionado à meta");
    },
    setBudget: async value => {
      if (!user) return;
      const { error } = await supabase.from("user_settings").update({ monthly_budget: value, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      if (error) return fail(error.message);
      setBudgetState(value);
      notify("Orçamento atualizado");
    },
    setDark: setDarkState,
    resetData: async () => {
      const [transactionsDelete, goalsDelete] = await Promise.all([
        supabase.from("transactions").delete().eq("user_id", user?.id ?? ""),
        supabase.from("goals").delete().eq("user_id", user?.id ?? ""),
      ]);
      const error = transactionsDelete.error ?? goalsDelete.error;
      if (error) return fail(error.message);
      setTransactions([]); setGoals([]);
      notify("Seus dados financeiros foram apagados");
    },
  }), [transactions, goals, budget, dark, toasts, loading, notify, user]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export const useFinance = () => {
  const value = useContext(FinanceContext);
  if (!value) throw new Error("FinanceProvider ausente");
  return value;
};

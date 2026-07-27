export type TransactionType = "income" | "expense";
export type TransactionStatus = "paid" | "pending" | "scheduled";
export type Transaction = {
  id: string; description: string; amount: number; type: TransactionType;
  category: string; date: string; paymentMethod: string;
  status: TransactionStatus; notes?: string; createdAt: string;
};
export type Goal = {
  id: string; name: string; targetAmount: number; currentAmount: number;
  deadline: string; createdAt: string;
};
export type Page = "dashboard" | "transactions" | "reports" | "budgets" | "goals" | "settings";

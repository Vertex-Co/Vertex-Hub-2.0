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
export type Period = "7" | "30" | "month" | "year";
export type ChartMode = "daily" | "weekly" | "monthly";
export type CategoryBudget = {
  id: string; category: string; amount: number; month: number; year: number;
  createdAt: string; updatedAt: string;
};
export type FinancialNotification = {
  id: string; title: string; description: string; page: Page; level: "info" | "warning" | "danger";
};

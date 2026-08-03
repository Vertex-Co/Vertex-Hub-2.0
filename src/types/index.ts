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
export type GlobalRole = "super_admin" | "admin" | "user";
export type AccountType = "company"|"employee";
export type OnboardingState = "account_created"|"account_type_selected"|"company_information"|"company_selected"|"activation_required"|"completed";
export type Profile = { userId:string; fullName:string; email:string; phone?:string; cpf?:string; avatarUrl?:string; globalRole:GlobalRole; onboardingCompleted:boolean; isAuthorized:boolean; accountType?:AccountType; onboardingState:OnboardingState; selectedCompanyId?:string };
export type CompanyRole = "company_owner"|"admin"|"manager"|"financial"|"employee"|"viewer"|"member";
export type Company = { id:string; name:string; legalName?:string; cnpj?:string; phone?:string; email?:string; logoUrl?:string; status:"active"|"suspended"|"inactive"; createdAt:string; ownerName?:string };
export type Page = "dashboard"|"transactions"|"reports"|"budgets"|"goals"|"tasks"|"crm"|"documents"|"calendar"|"settings"|"companies"|"admin-overview"|"admin-users"|"admin-resources"|"admin-keys"|"admin-content"|"admin-notifications"|"support"|"admin-audit"|"admin-security"|"admin-system"|"admin-settings";
export type Period = "7" | "30" | "month" | "year";
export type ChartMode = "daily" | "weekly" | "monthly";
export type CategoryBudget = {
  id: string; category: string; amount: number; month: number; year: number;
  createdAt: string; updatedAt: string;
};
export type FinancialNotification = {
  id: string; title: string; description: string; page: Page; level: "info" | "warning" | "danger";
};

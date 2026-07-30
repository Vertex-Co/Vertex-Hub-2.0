import { formatCurrency } from "./format";
export const formatProtectedCurrency = (value: number, hidden: boolean) => hidden ? "R$ •••••" : formatCurrency(value);

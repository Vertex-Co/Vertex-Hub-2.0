import { useMemo } from "react";
import type { Period, Transaction } from "../types";
import { getPeriodRanges, inRange } from "../utils/dateRanges";

const totals = (items: Transaction[]) => {
  const income = items.filter(item => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = items.filter(item => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  return { income, expense, balance: income - expense, savings: income - expense };
};
const compare = (current: number, previous: number) => ({
  current, previous, percentage: previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100,
  direction: current === previous ? "equal" as const : current > previous ? "up" as const : "down" as const,
});
export function usePeriodComparison(transactions: Transaction[], period: Period) {
  return useMemo(() => {
    const ranges = getPeriodRanges(period);
    const currentItems = transactions.filter(item => inRange(item, ranges.start, ranges.end));
    const previousItems = transactions.filter(item => inRange(item, ranges.previousStart, ranges.previousEnd));
    const current = totals(currentItems), previous = totals(previousItems);
    return { ranges, currentItems, previousItems, current, previous,
      comparisons: { income: compare(current.income, previous.income), expense: compare(current.expense, previous.expense), balance: compare(current.balance, previous.balance), savings: compare(current.savings, previous.savings) } };
  }, [transactions, period]);
}

import type { ChartMode, Period, Transaction } from "../types";

export const toLocalDateInputValue = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const parseLocalDate = (value: string) => {
  const normalized = String(value ?? "").trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const brMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const parts = isoMatch
    ? [Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3])]
    : brMatch
      ? [Number(brMatch[3]), Number(brMatch[2]), Number(brMatch[1])]
      : null;
  if (!parts) return new Date(Number.NaN);
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : new Date(Number.NaN);
};

export const normalizeLocalDateValue = (value: string) => {
  const date = parseLocalDate(value);
  return Number.isNaN(date.getTime()) ? value : toLocalDateInputValue(date);
};
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function getPeriodRanges(period: Period, now = new Date()) {
  const today = startOfDay(now);
  let start: Date;
  let previousStart: Date;
  let previousEnd: Date;
  if (period === "7" || period === "30") {
    const days = Number(period);
    start = new Date(today); start.setDate(start.getDate() - days + 1);
    previousEnd = new Date(start); previousEnd.setDate(previousEnd.getDate() - 1);
    previousStart = new Date(previousEnd); previousStart.setDate(previousStart.getDate() - days + 1);
  } else if (period === "month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    previousEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  } else {
    start = new Date(today.getFullYear(), 0, 1);
    previousStart = new Date(today.getFullYear() - 1, 0, 1);
    previousEnd = new Date(today.getFullYear() - 1, 11, 31);
  }
  return { start, end: today, previousStart, previousEnd };
}

export const inRange = (transaction: Transaction, start: Date, end: Date) => {
  const date = parseLocalDate(transaction.date);
  return !Number.isNaN(date.getTime()) && date >= start && date <= new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
};

export function groupTransactions(transactions: Transaction[], mode: ChartMode, start: Date, end: Date) {
  const buckets = new Map<string, { name: string; Receitas: number; Despesas: number; order: number }>();
  const cursor = new Date(start);
  while (cursor <= end) {
    let bucketDate = new Date(cursor);
    if (mode === "weekly") {
      const day = bucketDate.getDay() || 7;
      bucketDate.setDate(bucketDate.getDate() - day + 1);
    } else if (mode === "monthly") bucketDate = new Date(bucketDate.getFullYear(), bucketDate.getMonth(), 1);
    const key = mode === "daily" ? dateKey(bucketDate) : mode === "weekly" ? `w-${dateKey(bucketDate)}` : `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`;
    if (!buckets.has(key)) {
      const label = mode === "daily"
        ? bucketDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        : mode === "monthly"
          ? bucketDate.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
          : `${bucketDate.toLocaleDateString("pt-BR", { day: "2-digit" })} a ${new Date(bucketDate.getFullYear(), bucketDate.getMonth(), bucketDate.getDate() + 6).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
      buckets.set(key, { name: label, Receitas: 0, Despesas: 0, order: bucketDate.getTime() });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  transactions.forEach(transaction => {
    const date = parseLocalDate(transaction.date);
    if (Number.isNaN(date.getTime()) || !Number.isFinite(transaction.amount)) return;
    let bucketDate = new Date(date);
    if (mode === "weekly") { const day = bucketDate.getDay() || 7; bucketDate.setDate(bucketDate.getDate() - day + 1); }
    else if (mode === "monthly") bucketDate = new Date(bucketDate.getFullYear(), bucketDate.getMonth(), 1);
    const key = mode === "daily" ? dateKey(bucketDate) : mode === "weekly" ? `w-${dateKey(bucketDate)}` : `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`;
    const bucket = buckets.get(key);
    if (bucket) bucket[transaction.type === "income" ? "Receitas" : "Despesas"] += transaction.amount;
  });
  return [...buckets.values()].sort((a, b) => a.order - b.order);
}

const amountFormat = new Intl.NumberFormat("en-GH", {
  maximumFractionDigits: 0,
});

export function formatAmount(amount: number): string {
  return amountFormat.format(amount);
}

export function formatCurrency(amount: number): string {
  return `GHS ${formatAmount(amount)}`;
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
  }).format(new Date(dateStr));
}

export function formatMonthKey(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("en-GH", { month: "short", year: "2-digit" }).format(
    d
  );
}

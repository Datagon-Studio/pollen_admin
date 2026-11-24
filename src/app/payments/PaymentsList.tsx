import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSortedRows } from "@/lib/table-sort";
import { SortableTh } from "@/components/ui/sortable-th";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  adminApi,
  type AdminPaymentRow,
} from "@/services/admin.api";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { formatAmount, formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { TableExportMenu } from "@/components/export/TableExportMenu";
import type { ExportColumn } from "@/lib/export";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[10.5rem]";

const PAYMENT_EXPORT_COLUMNS: ExportColumn<AdminPaymentRow>[] = [
  { header: "Initiated", value: (p) => formatDateTime(p.created_at) },
  { header: "Customer", value: (p) => p.contributor_name },
  { header: "Email", value: (p) => p.user_email },
  { header: "Account", value: (p) => p.account_name || "Unnamed" },
  { header: "Fund", value: (p) => p.fund_name || "Fund" },
  { header: "Amount (GHS)", value: (p) => formatAmount(p.contribution_amount) },
  { header: "Status", value: (p) => p.status },
  { header: "Paystack status", value: (p) => p.paystack_status || "" },
  { header: "Reference", value: (p) => p.reference },
];

export default function PaymentsList() {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => adminApi.listPayments(),
    refetchInterval: 30_000,
  });

  const payments = data?.payments ?? [];
  const summary = data?.summary;

  const accountOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const p of payments) {
      if (!names.has(p.account_id)) {
        names.set(p.account_id, p.account_name || "Unnamed account");
      }
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payments]);

  const filtered = useMemo(
    () =>
      payments.filter((p) =>
        matchesPaymentFilters(p, { search, accountFilter, statusFilter, dateFilter })
      ),
    [payments, search, accountFilter, statusFilter, dateFilter]
  );

  const paymentSort = useSortedRows(filtered, (row, column) => {
    switch (column) {
      case "date":
        return row.created_at;
      case "customer":
        return row.contributor_name;
      case "account":
        return row.account_name || "Unnamed";
      case "fund":
        return row.fund_name || "Fund";
      case "amount":
        return row.contribution_amount;
      case "status":
        return row.status;
      case "reference":
        return row.reference;
      default:
        return "";
    }
  });
  const pagination = usePagination(
    paymentSort.sorted,
    undefined,
    `${search}|${accountFilter}|${statusFilter}|${dateFilter}`
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    accountFilter !== "all" ||
    statusFilter !== "all" ||
    dateFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setAccountFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
  };

  return (
    <SectionPage
      title="Payments"
      description="Paystack attempts across all accounts. Pending rows are reconciled automatically; verify is recovery."
      phase="ready"
    >
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Pending"
            value={summary.pending}
            active={statusFilter === "pending"}
            onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
          />
          <SummaryCard
            label="Successful"
            value={summary.successful}
            active={statusFilter === "successful"}
            onClick={() =>
              setStatusFilter(statusFilter === "successful" ? "all" : "successful")
            }
          />
          <SummaryCard
            label="Needs review"
            value={summary.needs_review}
            active={statusFilter === "needs_review"}
            emphasize={summary.needs_review > 0}
            onClick={() =>
              setStatusFilter(statusFilter === "needs_review" ? "all" : "needs_review")
            }
          />
          <SummaryCard
            label="Failed / abandoned"
            value={summary.failed + summary.abandoned}
            active={statusFilter === "failed" || statusFilter === "abandoned"}
            onClick={() => setStatusFilter(statusFilter === "failed" ? "all" : "failed")}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Last synchronization: {dataUpdatedAt ? formatDateTime(new Date(dataUpdatedAt).toISOString()) : "—"}
      </p>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, email, reference, account, fund…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            aria-label="Filter by account"
            className={SELECT_CLASS}
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="all">All accounts</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            className={SELECT_CLASS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="successful">Successful</option>
            <option value="needs_review">Needs review</option>
            <option value="failed">Failed</option>
            <option value="abandoned">Abandoned</option>
          </select>
          <select
            aria-label="Filter by date"
            className={SELECT_CLASS}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All dates</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="month">This month</option>
          </select>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <div className="ml-auto">
            <TableExportMenu
              filename="payments"
              title="Payments"
              subtitle={`Showing ${filtered.length} of ${payments.length} rows`}
              sheetName="Payments"
              columns={PAYMENT_EXPORT_COLUMNS}
              rows={paymentSort.sorted}
              disabled={isLoading || !!error}
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load payments"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {payments.length} rows
          </p>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <SortableTh
                    label="Initiated"
                    column="date"
                    sortColumn={paymentSort.sortColumn}
                    sortDirection={paymentSort.sortDirection}
                    onSort={paymentSort.onSort}
                  />
                  <SortableTh
                    label="Customer"
                    column="customer"
                    sortColumn={paymentSort.sortColumn}
                    sortDirection={paymentSort.sortDirection}
                    onSort={paymentSort.onSort}
                  />
                  <SortableTh
                    label="Account"
                    column="account"
                    sortColumn={paymentSort.sortColumn}
                    sortDirection={paymentSort.sortDirection}
                    onSort={paymentSort.onSort}
                  />
                  <SortableTh
                    label="Fund"
                    column="fund"
                    sortColumn={paymentSort.sortColumn}
                    sortDirection={paymentSort.sortDirection}
                    onSort={paymentSort.onSort}
                  />
                  <SortableTh
                    label="Amount (GHS)"
                    column="amount"
                    align="right"
                    sortColumn={paymentSort.sortColumn}
                    sortDirection={paymentSort.sortDirection}
                    onSort={paymentSort.onSort}
                  />
                  <SortableTh
                    label="Status"
                    column="status"
                    sortColumn={paymentSort.sortColumn}
                    sortDirection={paymentSort.sortDirection}
                    onSort={paymentSort.onSort}
                  />
                  <SortableTh
                    label="Reference"
                    column="reference"
                    sortColumn={paymentSort.sortColumn}
                    sortDirection={paymentSort.sortDirection}
                    onSort={paymentSort.onSort}
                  />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6">
                      <EmptyState
                        illustration={hasActiveFilters ? "file-searching" : "empty-mailbox"}
                        size="table"
                        description={
                          hasActiveFilters
                            ? "No payments match your filters"
                            : "No payments found"
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((p) => (
                    <tr
                      key={p.payment_id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-3 whitespace-nowrap">
                        <Link
                          to={`/payments/${p.payment_id}`}
                          className="hover:underline"
                        >
                          {formatDateTime(p.created_at)}
                        </Link>
                      </td>
                      <td className="p-3">
                        <div>{p.contributor_name}</div>
                        <div className="text-xs text-muted-foreground">{p.user_email}</div>
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/accounts/${p.account_id}`}
                          className="hover:underline"
                        >
                          {p.account_name || "Unnamed"}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Link to={`/funds/${p.fund_id}`} className="hover:underline">
                          {p.fund_name || "Fund"}
                        </Link>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatAmount(p.contribution_amount)}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground max-w-[140px] truncate">
                        {p.reference}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            onPageChange={pagination.setPage}
          />
        </>
      )}
    </SectionPage>
  );
}

function SummaryCard({
  label,
  value,
  active,
  emphasize,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  emphasize?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-card p-4 text-left transition-colors",
        active && "border-foreground/40 ring-1 ring-foreground/10",
        emphasize && "border-destructive/40"
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
    </button>
  );
}

function matchesPaymentFilters(
  p: AdminPaymentRow,
  filters: {
    search: string;
    accountFilter: string;
    statusFilter: string;
    dateFilter: string;
  }
): boolean {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = [
      p.contributor_name,
      p.user_email,
      p.reference,
      p.account_name ?? "",
      p.fund_name ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (filters.accountFilter !== "all" && p.account_id !== filters.accountFilter) {
    return false;
  }
  if (filters.statusFilter !== "all" && p.status !== filters.statusFilter) {
    return false;
  }

  if (filters.dateFilter !== "all") {
    const created = new Date(p.created_at).getTime();
    if (Number.isNaN(created)) return false;
    const now = new Date();
    if (filters.dateFilter === "7d") {
      if (created < now.getTime() - 7 * 24 * 60 * 60 * 1000) return false;
    } else if (filters.dateFilter === "30d") {
      if (created < now.getTime() - 30 * 24 * 60 * 60 * 1000) return false;
    } else if (filters.dateFilter === "month") {
      const d = new Date(p.created_at);
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) {
        return false;
      }
    }
  }

  return true;
}

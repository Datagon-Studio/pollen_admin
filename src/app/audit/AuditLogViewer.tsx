import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AuditLogTable } from "@/components/audit/AuditLogTable";
import { adminApi, type AuditLogEntry } from "@/services/admin.api";

const SELECT_CLASS =
  "h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[10.5rem]";

const categories = [
  { value: "all", label: "All categories" },
  { value: "PAYMENT", label: "Payment" },
  { value: "CONTRIBUTION", label: "Contribution" },
  { value: "MEMBER", label: "Member" },
  { value: "FUND", label: "Fund" },
  { value: "EXPENSE", label: "Expense" },
  { value: "ACCOUNT", label: "Account" },
  { value: "AUTH", label: "Auth" },
  { value: "SYSTEM", label: "System" },
];

export default function AuditLogViewer() {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => adminApi.listAuditLogs({ limit: 100 }),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: () => adminApi.listAccounts(),
  });

  const accountNames = useMemo(() => {
    const names = new Map<string, string | null>();
    for (const account of accounts) {
      names.set(account.account_id, account.account_name);
    }
    return names;
  }, [accounts]);

  const actionOptions = useMemo(() => {
    const types = new Set<string>();
    for (const log of logs) {
      if (category !== "all" && log.action_category !== category) continue;
      types.add(log.action_type);
    }
    return [...types].sort((a, b) => a.localeCompare(b));
  }, [logs, category]);

  const filtered = useMemo(
    () =>
      logs.filter((log) =>
        matchesAuditFilters(log, {
          search,
          accountFilter,
          category,
          statusFilter,
          actionFilter,
          accountName: log.account_id
            ? accountNames.get(log.account_id) ?? ""
            : "",
        })
      ),
    [logs, search, accountFilter, category, statusFilter, actionFilter, accountNames]
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    accountFilter !== "all" ||
    category !== "all" ||
    statusFilter !== "all" ||
    actionFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setAccountFilter("all");
    setCategory("all");
    setStatusFilter("all");
    setActionFilter("all");
  };

  return (
    <SectionPage
      title="Audit log"
      description="Platform-wide activity trail. Filter by account, category, action, or status."
      phase="ready"
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search action, details, account ID…"
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
            <option value="platform">Platform-wide</option>
            {accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.account_name || `Unnamed · ${a.account_id.slice(0, 8)}`}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by category"
            className={SELECT_CLASS}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setActionFilter("all");
            }}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by action"
            className={SELECT_CLASS}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
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
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
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
            {error instanceof Error ? error.message : "Failed to load audit log"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {logs.length} events (latest 100)
          </p>
          <AuditLogTable
            logs={filtered}
            showAccount={accountFilter === "all" || accountFilter === "platform"}
            accountNames={accountNames}
            emptyMessage={
              hasActiveFilters ? "No audit events match your filters" : "No audit events"
            }
          />
        </>
      )}
    </SectionPage>
  );
}

function matchesAuditFilters(
  log: AuditLogEntry,
  filters: {
    search: string;
    accountFilter: string;
    category: string;
    statusFilter: string;
    actionFilter: string;
    accountName: string;
  }
): boolean {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const details = log.action_details ? JSON.stringify(log.action_details) : "";
    const haystack = [
      log.action_type,
      log.action_category,
      filters.accountName,
      log.account_id ?? "",
      log.entity_id ?? "",
      log.entity_type ?? "",
      log.error_message ?? "",
      details,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (filters.accountFilter === "platform") {
    if (log.account_id) return false;
  } else if (
    filters.accountFilter !== "all" &&
    log.account_id !== filters.accountFilter
  ) {
    return false;
  }

  if (filters.category !== "all" && log.action_category !== filters.category) {
    return false;
  }

  if (filters.actionFilter !== "all" && log.action_type !== filters.actionFilter) {
    return false;
  }

  if (filters.statusFilter !== "all") {
    const ok = log.status === "success";
    if (filters.statusFilter === "success" && !ok) return false;
    if (filters.statusFilter === "failed" && ok) return false;
  }

  return true;
}

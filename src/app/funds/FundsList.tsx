import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useSortedRows } from "@/lib/table-sort";
import { SortableTh } from "@/components/ui/sortable-th";
import { useMemo, useState } from "react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminApi, type AdminFundSummary } from "@/services/admin.api";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { formatCurrency, formatDate } from "@/lib/format";

const SELECT_CLASS =
  "h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[10.5rem]";

export default function FundsList() {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [collectedFilter, setCollectedFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const { data: funds = [], isLoading, error } = useQuery({
    queryKey: ["admin-funds"],
    queryFn: () => adminApi.listFunds(),
  });

  const accountOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const f of funds) {
      if (!names.has(f.account_id)) {
        names.set(f.account_id, f.account_name || "Unnamed account");
      }
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [funds]);

  const filtered = useMemo(
    () =>
      funds.filter((f) =>
        matchesFundFilters(f, {
          search,
          accountFilter,
          collectedFilter,
          goalFilter,
          activeFilter,
          visibilityFilter,
        })
      ),
    [
      funds,
      search,
      accountFilter,
      collectedFilter,
      goalFilter,
      activeFilter,
      visibilityFilter,
    ]
  );

  const fundSort = useSortedRows(filtered, (fund, column) => {
    switch (column) {
      case "fund":
        return fund.fund_name;
      case "account":
        return fund.account_name || "Unnamed";
      case "collected":
        return fund.amount_collected;
      case "goal":
        return fund.fund_goal;
      case "visibility":
        return fund.is_public ? "Public" : "Private";
      case "status":
        return fund.is_active ? "Active" : "Inactive";
      case "created":
        return fund.created_at;
      default:
        return "";
    }
  });
  const pagination = usePagination(
    fundSort.sorted,
    undefined,
    `${search}|${accountFilter}|${collectedFilter}|${goalFilter}|${activeFilter}|${visibilityFilter}`
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    accountFilter !== "all" ||
    collectedFilter !== "all" ||
    goalFilter !== "all" ||
    activeFilter !== "all" ||
    visibilityFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setAccountFilter("all");
    setCollectedFilter("all");
    setGoalFilter("all");
    setActiveFilter("all");
    setVisibilityFilter("all");
  };

  return (
    <SectionPage
      title="Funds"
      description="System-wide fund list — collected vs goal, visibility, status. Read-only for staff."
      phase="ready"
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fund or account…"
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
            aria-label="Filter by amount collected"
            className={SELECT_CLASS}
            value={collectedFilter}
            onChange={(e) => setCollectedFilter(e.target.value)}
          >
            <option value="all">All collected</option>
            <option value="none">Nothing collected</option>
            <option value="has">Has collections</option>
            <option value="under1k">Under GHS 1,000</option>
            <option value="1k-10k">GHS 1,000–10,000</option>
            <option value="10kplus">Over GHS 10,000</option>
          </select>
          <select
            aria-label="Filter by goal progress"
            className={SELECT_CLASS}
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
          >
            <option value="all">All goals</option>
            <option value="none">No goal set</option>
            <option value="has">Has a goal</option>
            <option value="under">Under goal</option>
            <option value="met">Goal met</option>
          </select>
          <select
            aria-label="Filter by status"
            className={SELECT_CLASS}
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            aria-label="Filter by visibility"
            className={SELECT_CLASS}
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
          >
            <option value="all">All visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
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
            {error instanceof Error ? error.message : "Failed to load funds"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {funds.length} funds
          </p>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <SortableTh label="Fund" column="fund" sortColumn={fundSort.sortColumn} sortDirection={fundSort.sortDirection} onSort={fundSort.onSort} />
                  <SortableTh label="Account" column="account" sortColumn={fundSort.sortColumn} sortDirection={fundSort.sortDirection} onSort={fundSort.onSort} />
                  <SortableTh label="Collected" column="collected" align="right" sortColumn={fundSort.sortColumn} sortDirection={fundSort.sortDirection} onSort={fundSort.onSort} />
                  <SortableTh label="Goal" column="goal" align="right" sortColumn={fundSort.sortColumn} sortDirection={fundSort.sortDirection} onSort={fundSort.onSort} />
                  <SortableTh label="Visibility" column="visibility" sortColumn={fundSort.sortColumn} sortDirection={fundSort.sortDirection} onSort={fundSort.onSort} />
                  <SortableTh label="Status" column="status" sortColumn={fundSort.sortColumn} sortDirection={fundSort.sortDirection} onSort={fundSort.onSort} />
                  <SortableTh label="Created" column="created" sortColumn={fundSort.sortColumn} sortDirection={fundSort.sortDirection} onSort={fundSort.onSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {hasActiveFilters
                        ? "No funds match your filters"
                        : "No funds found"}
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((f) => (
                    <tr
                      key={f.fund_id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-3">
                        <Link to={`/funds/${f.fund_id}`} className="font-medium hover:underline">
                          {f.fund_name}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/accounts/${f.account_id}`}
                          className="hover:underline"
                        >
                          {f.account_name || "Unnamed"}
                        </Link>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(f.amount_collected)}
                      </td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                        {f.fund_goal != null ? formatCurrency(f.fund_goal) : "—"}
                      </td>
                      <td className="p-3">
                        {f.is_public ? "Public" : "Private"}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={f.is_active ? "active" : "inactive"} />
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(f.created_at)}
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

function matchesFundFilters(
  f: AdminFundSummary,
  filters: {
    search: string;
    accountFilter: string;
    collectedFilter: string;
    goalFilter: string;
    activeFilter: string;
    visibilityFilter: string;
  }
): boolean {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = `${f.fund_name} ${f.account_name ?? ""}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (filters.accountFilter !== "all" && f.account_id !== filters.accountFilter) {
    return false;
  }

  const collected = f.amount_collected;
  if (filters.collectedFilter === "none" && collected !== 0) return false;
  if (filters.collectedFilter === "has" && collected <= 0) return false;
  if (filters.collectedFilter === "under1k") {
    if (collected <= 0 || collected >= 1000) return false;
  }
  if (filters.collectedFilter === "1k-10k") {
    if (collected < 1000 || collected >= 10_000) return false;
  }
  if (filters.collectedFilter === "10kplus" && collected < 10_000) return false;

  const goal = f.fund_goal;
  if (filters.goalFilter === "none" && goal != null) return false;
  if (filters.goalFilter === "has" && goal == null) return false;
  if (filters.goalFilter === "under") {
    if (goal == null || collected >= goal) return false;
  }
  if (filters.goalFilter === "met") {
    if (goal == null || collected < goal) return false;
  }

  if (filters.activeFilter === "active" && !f.is_active) return false;
  if (filters.activeFilter === "inactive" && f.is_active) return false;

  if (filters.visibilityFilter === "public" && !f.is_public) return false;
  if (filters.visibilityFilter === "private" && f.is_public) return false;

  return true;
}

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
import { adminApi, type AdminContributionRow } from "@/services/admin.api";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { formatAmount, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

const SELECT_CLASS =
  "h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[10.5rem]";

export default function ContributionsList() {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [fundFilter, setFundFilter] = useState("all");
  const [amountFilter, setAmountFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const { data: contributions = [], isLoading, error } = useQuery({
    queryKey: ["admin-contributions"],
    queryFn: () => adminApi.listContributions(),
  });

  const accountOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const c of contributions) {
      if (!names.has(c.account_id)) {
        names.set(c.account_id, c.account_name || "Unnamed account");
      }
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contributions]);

  const fundOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const c of contributions) {
      if (accountFilter !== "all" && c.account_id !== accountFilter) continue;
      if (!names.has(c.fund_id)) {
        names.set(c.fund_id, c.fund_name || "Unnamed fund");
      }
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contributions, accountFilter]);

  const filtered = useMemo(
    () =>
      contributions.filter((c) =>
        matchesContributionFilters(c, {
          search,
          accountFilter,
          fundFilter,
          amountFilter,
          memberFilter,
          channelFilter,
          statusFilter,
          dateFilter,
        })
      ),
    [
      contributions,
      search,
      accountFilter,
      fundFilter,
      amountFilter,
      memberFilter,
      channelFilter,
      statusFilter,
      dateFilter,
    ]
  );

  const contributionSort = useSortedRows(filtered, (row, column) => {
    switch (column) {
      case "date":
        return row.date_received;
      case "member":
        return row.member_name || "Anonymous";
      case "account":
        return row.account_name || "Unnamed";
      case "fund":
        return row.fund_name || "Fund";
      case "amount":
        return row.amount;
      case "channel":
        return row.channel === "online" ? "Online" : "Manual";
      case "status":
        return row.status;
      case "reference":
        return row.payment_reference || "";
      default:
        return "";
    }
  });
  const pagination = usePagination(
    contributionSort.sorted,
    undefined,
    `${search}|${accountFilter}|${fundFilter}|${amountFilter}|${memberFilter}|${channelFilter}|${statusFilter}|${dateFilter}`
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    accountFilter !== "all" ||
    fundFilter !== "all" ||
    amountFilter !== "all" ||
    memberFilter !== "all" ||
    channelFilter !== "all" ||
    statusFilter !== "all" ||
    dateFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setAccountFilter("all");
    setFundFilter("all");
    setAmountFilter("all");
    setMemberFilter("all");
    setChannelFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
  };

  return (
    <SectionPage
      title="Contributions"
      description="Read-only ledger across all accounts. Online rows are never hard-deleted."
      phase="ready"
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search member, reference, account, fund…"
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
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setFundFilter("all");
            }}
          >
            <option value="all">All accounts</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by fund"
            className={SELECT_CLASS}
            value={fundFilter}
            onChange={(e) => setFundFilter(e.target.value)}
          >
            <option value="all">All funds</option>
            {fundOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by amount"
            className={SELECT_CLASS}
            value={amountFilter}
            onChange={(e) => setAmountFilter(e.target.value)}
          >
            <option value="all">All amounts</option>
            <option value="under100">Under GHS 100</option>
            <option value="100-1k">GHS 100–1,000</option>
            <option value="1k-10k">GHS 1,000–10,000</option>
            <option value="10kplus">Over GHS 10,000</option>
          </select>
          <select
            aria-label="Filter by member"
            className={SELECT_CLASS}
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
          >
            <option value="all">All members</option>
            <option value="named">Named member</option>
            <option value="anonymous">Anonymous</option>
          </select>
          <select
            aria-label="Filter by channel"
            className={SELECT_CLASS}
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
          >
            <option value="all">All channels</option>
            <option value="online">Online</option>
            <option value="offline">Manual</option>
          </select>
          <select
            aria-label="Filter by status"
            className={SELECT_CLASS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
            <option value="reversed">Reversed</option>
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
            {error instanceof Error ? error.message : "Failed to load contributions"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {contributions.length} rows (latest 500 from server)
          </p>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <SortableTh label="Date" column="date" sortColumn={contributionSort.sortColumn} sortDirection={contributionSort.sortDirection} onSort={contributionSort.onSort} />
                  <SortableTh label="Member" column="member" sortColumn={contributionSort.sortColumn} sortDirection={contributionSort.sortDirection} onSort={contributionSort.onSort} />
                  <SortableTh label="Account" column="account" sortColumn={contributionSort.sortColumn} sortDirection={contributionSort.sortDirection} onSort={contributionSort.onSort} />
                  <SortableTh label="Fund" column="fund" sortColumn={contributionSort.sortColumn} sortDirection={contributionSort.sortDirection} onSort={contributionSort.onSort} />
                  <SortableTh label="Amount (GHS)" column="amount" align="right" sortColumn={contributionSort.sortColumn} sortDirection={contributionSort.sortDirection} onSort={contributionSort.onSort} />
                  <SortableTh label="Channel" column="channel" sortColumn={contributionSort.sortColumn} sortDirection={contributionSort.sortDirection} onSort={contributionSort.onSort} />
                  <SortableTh label="Status" column="status" sortColumn={contributionSort.sortColumn} sortDirection={contributionSort.sortDirection} onSort={contributionSort.onSort} />
                  <SortableTh label="Reference" column="reference" sortColumn={contributionSort.sortColumn} sortDirection={contributionSort.sortDirection} onSort={contributionSort.onSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6">
                      <EmptyState
                        illustration={hasActiveFilters ? "file-searching" : "empty-mailbox"}
                        size="table"
                        description={
                          hasActiveFilters
                            ? "No contributions match your filters"
                            : "No contributions found"
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((c) => (
                    <tr
                      key={c.contribution_id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-3 whitespace-nowrap">
                        <Link
                          to={`/contributions/${c.contribution_id}`}
                          className="hover:underline"
                        >
                          {formatDate(c.date_received)}
                        </Link>
                      </td>
                      <td className="p-3">
                        {c.member_id ? (
                          <Link
                            to={`/members/${c.member_id}`}
                            className="hover:underline"
                          >
                            {c.member_name || "Member"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Anonymous</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/accounts/${c.account_id}`}
                          className="hover:underline"
                        >
                          {c.account_name || "Unnamed"}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Link to={`/funds/${c.fund_id}`} className="hover:underline">
                          {c.fund_name || "Fund"}
                        </Link>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatAmount(c.amount)}
                      </td>
                      <td className="p-3 capitalize">
                        {c.channel === "online" ? "Online" : "Manual"}
                      </td>
                      <td className="p-3">
                        <StatusBadge
                          status={
                            c.status as
                              | "pending"
                              | "confirmed"
                              | "failed"
                              | "reversed"
                          }
                        />
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                        {c.payment_reference || "—"}
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

function matchesContributionFilters(
  c: AdminContributionRow,
  filters: {
    search: string;
    accountFilter: string;
    fundFilter: string;
    amountFilter: string;
    memberFilter: string;
    channelFilter: string;
    statusFilter: string;
    dateFilter: string;
  }
): boolean {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = [
      c.member_name ?? "",
      c.payment_reference ?? "",
      c.account_name ?? "",
      c.fund_name ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (filters.accountFilter !== "all" && c.account_id !== filters.accountFilter) {
    return false;
  }
  if (filters.fundFilter !== "all" && c.fund_id !== filters.fundFilter) {
    return false;
  }

  const amount = c.amount;
  if (filters.amountFilter === "under100" && amount >= 100) return false;
  if (filters.amountFilter === "100-1k" && (amount < 100 || amount >= 1000)) return false;
  if (filters.amountFilter === "1k-10k" && (amount < 1000 || amount >= 10_000)) {
    return false;
  }
  if (filters.amountFilter === "10kplus" && amount < 10_000) return false;

  if (filters.memberFilter === "named" && !c.member_id) return false;
  if (filters.memberFilter === "anonymous" && c.member_id) return false;

  if (filters.channelFilter === "online" && c.channel !== "online") return false;
  if (filters.channelFilter === "offline" && c.channel !== "offline") return false;

  if (filters.statusFilter !== "all" && c.status !== filters.statusFilter) {
    return false;
  }

  if (filters.dateFilter !== "all") {
    const received = new Date(c.date_received).getTime();
    if (Number.isNaN(received)) return false;
    const now = new Date();
    if (filters.dateFilter === "7d") {
      const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      if (received < cutoff) return false;
    } else if (filters.dateFilter === "30d") {
      const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      if (received < cutoff) return false;
    } else if (filters.dateFilter === "month") {
      if (
        new Date(c.date_received).getFullYear() !== now.getFullYear() ||
        new Date(c.date_received).getMonth() !== now.getMonth()
      ) {
        return false;
      }
    }
  }

  return true;
}

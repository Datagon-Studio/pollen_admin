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
import { adminApi, type AdminMemberSummary } from "@/services/admin.api";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { formatAmount, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

const SELECT_CLASS =
  "h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[10.5rem]";

export default function MembersList() {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [groupsFilter, setGroupsFilter] = useState("all");
  const [contribFilter, setContribFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ["admin-members"],
    queryFn: () => adminApi.listMembers(),
  });

  const accountOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const m of members) {
      if (!names.has(m.account_id)) {
        names.set(m.account_id, m.account_name || "Unnamed account");
      }
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  const filtered = useMemo(
    () =>
      members.filter((m) => matchesMemberFilters(m, {
        search,
        accountFilter,
        groupsFilter,
        contribFilter,
        verifiedFilter,
      })),
    [members, search, accountFilter, groupsFilter, contribFilter, verifiedFilter]
  );

  const memberSort = useSortedRows(filtered, (member, column) => {
    switch (column) {
      case "name":
        return member.full_name;
      case "contact":
        return member.email ? `${member.phone} ${member.email}` : member.phone;
      case "account":
        return member.account_name || "Unnamed";
      case "also":
        return member.also_in_count;
      case "status":
        return member.is_active ? "Active" : "Inactive";
      case "contributions":
        return member.contribution_total;
      case "joined":
        return member.created_at;
      default:
        return "";
    }
  });
  const pagination = usePagination(
    memberSort.sorted,
    undefined,
    `${search}|${accountFilter}|${groupsFilter}|${contribFilter}|${verifiedFilter}`
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    accountFilter !== "all" ||
    groupsFilter !== "all" ||
    contribFilter !== "all" ||
    verifiedFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setAccountFilter("all");
    setGroupsFilter("all");
    setContribFilter("all");
    setVerifiedFilter("all");
  };

  return (
    <SectionPage
      title="Members"
      description="All memberships across accounts. Identity clustering for same verified phone/email in other groups."
      phase="ready"
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, account, membership no.…"
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
            aria-label="Filter by number of groups"
            className={SELECT_CLASS}
            value={groupsFilter}
            onChange={(e) => setGroupsFilter(e.target.value)}
          >
            <option value="all">All group counts</option>
            <option value="1">1 group</option>
            <option value="2">2 groups</option>
            <option value="3plus">3+ groups</option>
          </select>
          <select
            aria-label="Filter by contributions"
            className={SELECT_CLASS}
            value={contribFilter}
            onChange={(e) => setContribFilter(e.target.value)}
          >
            <option value="all">All contributions</option>
            <option value="none">No contributions</option>
            <option value="has">Has contributions</option>
            <option value="under1k">Under GHS 1,000</option>
            <option value="1k-10k">GHS 1,000–10,000</option>
            <option value="10kplus">Over GHS 10,000</option>
          </select>
          <select
            aria-label="Filter by verification"
            className={SELECT_CLASS}
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
          >
            <option value="all">All verification</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
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
            {error instanceof Error ? error.message : "Failed to load members"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {members.length} memberships
          </p>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <SortableTh label="Name" column="name" sortColumn={memberSort.sortColumn} sortDirection={memberSort.sortDirection} onSort={memberSort.onSort} />
                  <SortableTh label="Contact" column="contact" sortColumn={memberSort.sortColumn} sortDirection={memberSort.sortDirection} onSort={memberSort.onSort} />
                  <SortableTh label="Account" column="account" sortColumn={memberSort.sortColumn} sortDirection={memberSort.sortDirection} onSort={memberSort.onSort} />
                  <SortableTh label="Also in" column="also" sortColumn={memberSort.sortColumn} sortDirection={memberSort.sortDirection} onSort={memberSort.onSort} />
                  <SortableTh label="Status" column="status" sortColumn={memberSort.sortColumn} sortDirection={memberSort.sortDirection} onSort={memberSort.onSort} />
                  <SortableTh label="Contributions (GHS)" column="contributions" align="right" sortColumn={memberSort.sortColumn} sortDirection={memberSort.sortDirection} onSort={memberSort.onSort} />
                  <SortableTh label="Joined" column="joined" sortColumn={memberSort.sortColumn} sortDirection={memberSort.sortDirection} onSort={memberSort.onSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6">
                      <EmptyState
                        illustration={hasActiveFilters ? "file-searching" : "collaboration"}
                        size="table"
                        description={
                          hasActiveFilters
                            ? "No memberships match your filters"
                            : "No memberships found"
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((m) => (
                    <tr
                      key={m.member_id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-3">
                        <Link
                          to={`/members/${m.member_id}`}
                          className="font-medium hover:underline"
                        >
                          {m.full_name}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <div>{m.phone}</div>
                        {m.email && <div className="text-xs">{m.email}</div>}
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/accounts/${m.account_id}`}
                          className="hover:underline"
                        >
                          {m.account_name || "Unnamed"}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {m.also_in_count > 0 ? `+${m.also_in_count} groups` : "—"}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={m.is_active ? "active" : "inactive"} />
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        <div>{m.contribution_count}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatAmount(m.contribution_total)}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(m.created_at)}
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

function matchesMemberFilters(
  m: AdminMemberSummary,
  filters: {
    search: string;
    accountFilter: string;
    groupsFilter: string;
    contribFilter: string;
    verifiedFilter: string;
  }
): boolean {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = [
      m.full_name,
      m.phone,
      m.email ?? "",
      m.account_name ?? "",
      m.membership_number ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (filters.accountFilter !== "all" && m.account_id !== filters.accountFilter) {
    return false;
  }

  const groupCount = m.also_in_count + 1;
  if (filters.groupsFilter === "1" && groupCount !== 1) return false;
  if (filters.groupsFilter === "2" && groupCount !== 2) return false;
  if (filters.groupsFilter === "3plus" && groupCount < 3) return false;

  if (filters.contribFilter === "none" && m.contribution_count !== 0) return false;
  if (filters.contribFilter === "has" && m.contribution_count === 0) return false;
  if (filters.contribFilter === "under1k") {
    if (m.contribution_total <= 0 || m.contribution_total >= 1000) return false;
  }
  if (filters.contribFilter === "1k-10k") {
    if (m.contribution_total < 1000 || m.contribution_total >= 10_000) return false;
  }
  if (filters.contribFilter === "10kplus" && m.contribution_total < 10_000) {
    return false;
  }

  if (filters.verifiedFilter === "verified" && !m.is_active) return false;
  if (filters.verifiedFilter === "unverified" && m.is_active) return false;

  return true;
}


import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { useSortedRows } from "@/lib/table-sort";
import { SortableTh } from "@/components/ui/sortable-th";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/usePagination";
import type { AdminContributionRow } from "@/services/admin.api";
import { EmptyState, type IllustrationName } from "@/components/ui/empty-state";

type ContributionTableProps = {
  rows: AdminContributionRow[];
  showAccount?: boolean;
  emptyMessage?: string;
  emptyIllustration?: IllustrationName;
};

export function ContributionTable({
  rows,
  showAccount = false,
  emptyMessage = "No contributions",
  emptyIllustration = "empty-mailbox",
}: ContributionTableProps) {
  const rowSort = useSortedRows(rows, (row, column) => {
    switch (column) {
      case "date":
        return row.date_received;
      case "account":
        return row.account_name || "Unnamed";
      case "member":
        return row.member_name || "Anonymous";
      case "fund":
        return row.fund_name || "Fund";
      case "amount":
        return row.amount;
      case "channel":
        return row.channel === "online" ? "Online" : "Manual";
      case "status":
        return row.status;
      default:
        return "";
    }
  });
  const pagination = usePagination(
    rowSort.sorted,
    undefined,
    rows.map((row) => row.contribution_id).join(",")
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        illustration={emptyIllustration}
        size="table"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="space-y-3">
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <SortableTh label="Date" column="date" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
            {showAccount && (
              <SortableTh label="Account" column="account" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
            )}
            <SortableTh label="Member" column="member" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
            <SortableTh label="Fund" column="fund" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
            <SortableTh label="Amount" column="amount" align="right" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
            <SortableTh label="Channel" column="channel" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
            <SortableTh label="Status" column="status" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
          </tr>
        </thead>
        <tbody>
          {pagination.paginatedItems.map((c) => (
            <tr key={c.contribution_id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="p-3 whitespace-nowrap">
                <Link
                  to={`/contributions/${c.contribution_id}`}
                  className="hover:underline"
                >
                  {formatDate(c.date_received)}
                </Link>
              </td>
              {showAccount && (
                <td className="p-3">
                  <Link to={`/accounts/${c.account_id}`} className="hover:underline">
                    {c.account_name || "Unnamed"}
                  </Link>
                </td>
              )}
              <td className="p-3">
                {c.member_id ? (
                  <Link to={`/members/${c.member_id}`} className="hover:underline">
                    {c.member_name || "Member"}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Anonymous</span>
                )}
              </td>
              <td className="p-3">
                <Link to={`/funds/${c.fund_id}`} className="hover:underline">
                  {c.fund_name || "Fund"}
                </Link>
              </td>
              <td className="p-3 text-right tabular-nums">{formatCurrency(c.amount)}</td>
              <td className="p-3 capitalize">{c.channel === "online" ? "Online" : "Manual"}</td>
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
            </tr>
          ))}
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
    </div>
  );
}

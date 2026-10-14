import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdminSettlementRequest } from "@/services/admin.api";
import { formatCurrency, formatDate } from "@/lib/format";
import { useSortedRows } from "@/lib/table-sort";
import { SortableTh } from "@/components/ui/sortable-th";

export function SettlementRequestTable({
  requests,
  hideAccount = false,
  hideFund = false,
}: {
  requests: AdminSettlementRequest[];
  hideAccount?: boolean;
  hideFund?: boolean;
}) {
  const requestSort = useSortedRows(requests, (request, column) => {
    switch (column) {
      case "requested":
        return request.created_at;
      case "account":
        return request.account_name;
      case "fund":
        return request.fund_name;
      case "amount":
        return Number(request.amount);
      case "status":
        return request.status;
      default:
        return "";
    }
  });

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30">
          <tr>
            <SortableTh label="Requested" column="requested" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
            {!hideAccount && (
              <SortableTh label="Account" column="account" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
            )}
            {!hideFund && (
              <SortableTh label="Fund" column="fund" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
            )}
            <SortableTh label="Amount" column="amount" align="right" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
            <SortableTh label="Status" column="status" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
            <th className="p-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {requestSort.sorted.map((request) => (
            <tr key={request.request_id} className="hover:bg-muted/20">
              <td className="p-3 text-muted-foreground">{formatDate(request.created_at)}</td>
              {!hideAccount && (
                <td className="p-3 font-medium">{request.account_name}</td>
              )}
              {!hideFund && <td className="p-3">{request.fund_name}</td>}
              <td className="p-3 text-right font-semibold">
                {formatCurrency(Number(request.amount))}
              </td>
              <td className="p-3">
                <StatusBadge status={request.status} />
              </td>
              <td className="p-3 text-right">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/settlements/${request.request_id}`}>View</Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

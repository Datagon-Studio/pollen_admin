import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SectionPage } from "@/components/pages/SectionPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  adminApi,
  SettlementRequestStatus,
} from "@/services/admin.api";
import { formatCurrency, formatDate } from "@/lib/format";
import { useSortedRows } from "@/lib/table-sort";
import { SortableTh } from "@/components/ui/sortable-th";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { EmptyState } from "@/components/ui/empty-state";

const filters: Array<"all" | SettlementRequestStatus> = [
  "all",
  "pending",
  "approved",
  "rejected",
  "disbursed",
];

export default function SettlementsList() {
  const [status, setStatus] = useState<"all" | SettlementRequestStatus>("all");
  const [search, setSearch] = useState("");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["settlement-requests", status],
    queryFn: () =>
      adminApi.listSettlementRequests({
        status: status === "all" ? undefined : status,
      }),
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data;
    return data.filter(
      (request) =>
        request.account_name.toLowerCase().includes(query) ||
        request.fund_name.toLowerCase().includes(query) ||
        request.requester_name?.toLowerCase().includes(query)
    );
  }, [data, search]);

  const requestSort = useSortedRows(filtered, (request, column) => {
    switch (column) {
      case "requested":
        return request.created_at;
      case "account":
        return request.account_name;
      case "fund":
        return request.fund_name;
      case "requester":
        return request.requester_name || request.requester_email || "Unknown";
      case "amount":
        return Number(request.amount);
      case "details":
        return request.destination_account_name;
      case "status":
        return request.status;
      default:
        return "";
    }
  });
  const pagination = usePagination(requestSort.sorted, undefined, `${status}|${search}`);

  return (
    <SectionPage
      title="Settlement requests"
      description="Review manager requests, verify payment details, and track approval through disbursement."
      phase="ready"
    >
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={status === filter ? "default" : "outline"}
                onClick={() => setStatus(filter)}
                className="capitalize"
              >
                {filter}
              </Button>
            ))}
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search account, fund, or requester"
            className="w-full lg:w-80"
          />
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <SortableTh label="Requested" column="requested" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
                <SortableTh label="Account" column="account" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
                <SortableTh label="Fund" column="fund" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
                <SortableTh label="Requester" column="requester" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
                <SortableTh label="Amount" column="amount" align="right" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
                <SortableTh label="Payment details" column="details" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
                <SortableTh label="Status" column="status" sortColumn={requestSort.sortColumn} sortDirection={requestSort.sortDirection} onSort={requestSort.onSort} />
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagination.paginatedItems.map((request) => (
                <tr key={request.request_id} className="hover:bg-muted/20">
                  <td className="p-3 text-muted-foreground">
                    {formatDate(request.created_at)}
                  </td>
                  <td className="p-3 font-medium">{request.account_name}</td>
                  <td className="p-3">{request.fund_name}</td>
                  <td className="p-3">
                    {request.requester_name || request.requester_email || "Unknown"}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {formatCurrency(Number(request.amount))}
                  </td>
                  <td className="p-3">
                    <p>{request.destination_account_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.destination_bank_name || request.destination_provider} ·
                      {" "}••••{request.destination_account_number.slice(-4)}
                    </p>
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
          {isLoading && (
            <div className="p-10 text-center text-muted-foreground">
              Loading settlement requests...
            </div>
          )}
          {error && (
            <div className="p-10 text-center text-destructive">
              {error instanceof Error ? error.message : "Unable to load requests"}
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="p-6">
              <EmptyState
                illustration={
                  status === "all" && !search.trim() ? "signed-document" : "file-searching"
                }
                size="table"
                description="No settlement requests match this view."
              />
            </div>
          )}
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
    </SectionPage>
  );
}

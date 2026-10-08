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
                <th className="text-left p-3 font-medium">Requested</th>
                <th className="text-left p-3 font-medium">Account</th>
                <th className="text-left p-3 font-medium">Fund</th>
                <th className="text-left p-3 font-medium">Requester</th>
                <th className="text-right p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Payment details</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((request) => (
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
            <div className="p-10 text-center text-muted-foreground">
              No settlement requests match this view.
            </div>
          )}
        </div>
      </div>
    </SectionPage>
  );
}

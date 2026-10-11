import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdminSettlementRequest } from "@/services/admin.api";
import { formatCurrency, formatDate } from "@/lib/format";

export function SettlementRequestTable({
  requests,
  hideAccount = false,
  hideFund = false,
}: {
  requests: AdminSettlementRequest[];
  hideAccount?: boolean;
  hideFund?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30">
          <tr>
            <th className="text-left p-3 font-medium">Requested</th>
            {!hideAccount && <th className="text-left p-3 font-medium">Account</th>}
            {!hideFund && <th className="text-left p-3 font-medium">Fund</th>}
            <th className="text-right p-3 font-medium">Amount</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {requests.map((request) => (
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

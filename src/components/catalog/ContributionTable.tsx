import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AdminContributionRow } from "@/services/admin.api";

type ContributionTableProps = {
  rows: AdminContributionRow[];
  showAccount?: boolean;
  emptyMessage?: string;
};

export function ContributionTable({
  rows,
  showAccount = false,
  emptyMessage = "No contributions",
}: ContributionTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>;
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="text-left p-3 font-medium">Date</th>
            {showAccount && <th className="text-left p-3 font-medium">Account</th>}
            <th className="text-left p-3 font-medium">Member</th>
            <th className="text-left p-3 font-medium">Fund</th>
            <th className="text-right p-3 font-medium">Amount</th>
            <th className="text-left p-3 font-medium">Channel</th>
            <th className="text-left p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
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
  );
}

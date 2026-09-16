import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminApi } from "@/services/admin.api";
import { formatCurrency, formatDate } from "@/lib/format";

export default function ContributionsList() {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: contributions = [], isLoading, error } = useQuery({
    queryKey: ["admin-contributions", channelFilter, statusFilter],
    queryFn: () =>
      adminApi.listContributions({
        channel:
          channelFilter === "online" || channelFilter === "offline"
            ? channelFilter
            : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contributions;
    return contributions.filter(
      (c) =>
        (c.member_name?.toLowerCase().includes(q) ?? false) ||
        (c.payment_reference?.toLowerCase().includes(q) ?? false) ||
        (c.account_name?.toLowerCase().includes(q) ?? false) ||
        (c.fund_name?.toLowerCase().includes(q) ?? false)
    );
  }, [contributions, search]);

  return (
    <SectionPage
      title="Contributions"
      description="Read-only ledger across all accounts. Online rows are never hard-deleted."
      phase="ready"
    >
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search member, reference, account, fund…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
        >
          <option value="all">All channels</option>
          <option value="online">Online</option>
          <option value="offline">Manual</option>
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="failed">Failed</option>
          <option value="reversed">Reversed</option>
        </select>
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
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Member</th>
                  <th className="text-left p-3 font-medium">Account</th>
                  <th className="text-left p-3 font-medium">Fund</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Channel</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No contributions found
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
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
                        {formatCurrency(c.amount)}
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
        </>
      )}
    </SectionPage>
  );
}

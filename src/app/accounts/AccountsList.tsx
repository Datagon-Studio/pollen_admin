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

export default function AccountsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: () => adminApi.listAccounts(),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (kycFilter !== "all" && a.kyc_status !== kycFilter) return false;
      if (!q) return true;
      return (
        (a.account_name?.toLowerCase().includes(q) ?? false) ||
        a.account_id.toLowerCase().includes(q)
      );
    });
  }, [accounts, search, statusFilter, kycFilter]);

  return (
    <SectionPage
      title="Accounts"
      description="Every organization account on Pollean — status, KYC, members, funds, and collected totals."
      phase="ready"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or account ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value)}
        >
          <option value="all">All KYC</option>
          <option value="unverified">Unverified</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
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
            {error instanceof Error ? error.message : "Failed to load accounts"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {accounts.length} accounts
          </p>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Account</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">KYC</th>
                  <th className="text-right p-3 font-medium">Members</th>
                  <th className="text-right p-3 font-medium">Funds</th>
                  <th className="text-right p-3 font-medium">Collected</th>
                  <th className="text-left p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No accounts match your filters
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.account_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <Link
                          to={`/accounts/${a.account_id}`}
                          className="font-medium hover:underline"
                        >
                          {a.account_name || "Unnamed account"}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[200px]">
                          {a.account_id}
                        </p>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={a.status as "active" | "inactive" | "suspended"} />
                      </td>
                      <td className="p-3">
                        <StatusBadge
                          status={
                            a.kyc_status as
                              | "unverified"
                              | "pending"
                              | "verified"
                              | "rejected"
                          }
                        />
                      </td>
                      <td className="p-3 text-right tabular-nums">{a.member_count}</td>
                      <td className="p-3 text-right tabular-nums">
                        {a.active_fund_count}/{a.fund_count}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(a.total_collected)}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(a.created_at)}
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

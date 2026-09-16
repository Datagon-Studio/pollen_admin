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

export default function FundsList() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const { data: funds = [], isLoading, error } = useQuery({
    queryKey: ["admin-funds", activeFilter, visibilityFilter],
    queryFn: () =>
      adminApi.listFunds({
        isActive:
          activeFilter === "active"
            ? true
            : activeFilter === "inactive"
              ? false
              : undefined,
        isPublic:
          visibilityFilter === "public"
            ? true
            : visibilityFilter === "private"
              ? false
              : undefined,
      }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return funds;
    return funds.filter(
      (f) =>
        f.fund_name.toLowerCase().includes(q) ||
        (f.account_name?.toLowerCase().includes(q) ?? false)
    );
  }, [funds, search]);

  return (
    <SectionPage
      title="Funds"
      description="System-wide fund list — collected vs goal, visibility, status. Read-only for staff."
      phase="ready"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fund or account…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
        >
          <option value="all">All visibility</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
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
            {error instanceof Error ? error.message : "Failed to load funds"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {funds.length} funds
          </p>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Fund</th>
                  <th className="text-left p-3 font-medium">Account</th>
                  <th className="text-right p-3 font-medium">Collected</th>
                  <th className="text-right p-3 font-medium">Goal</th>
                  <th className="text-left p-3 font-medium">Visibility</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No funds found
                    </td>
                  </tr>
                ) : (
                  filtered.map((f) => (
                    <tr
                      key={f.fund_id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-3">
                        <Link to={`/funds/${f.fund_id}`} className="font-medium hover:underline">
                          {f.fund_name}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/accounts/${f.account_id}`}
                          className="hover:underline"
                        >
                          {f.account_name || "Unnamed"}
                        </Link>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(f.amount_collected)}
                      </td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                        {f.fund_goal != null ? formatCurrency(f.fund_goal) : "—"}
                      </td>
                      <td className="p-3">
                        {f.is_public ? "Public" : "Private"}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={f.is_active ? "active" : "inactive"} />
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(f.created_at)}
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

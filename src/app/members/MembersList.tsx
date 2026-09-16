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

export default function MembersList() {
  const [search, setSearch] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("all");

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ["admin-members", verifiedFilter],
    queryFn: () =>
      adminApi.listMembers({
        verified:
          verifiedFilter === "verified"
            ? true
            : verifiedFilter === "unverified"
              ? false
              : undefined,
      }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.email?.toLowerCase().includes(q) ?? false) ||
        (m.account_name?.toLowerCase().includes(q) ?? false)
    );
  }, [members, search]);

  return (
    <SectionPage
      title="Members"
      description="All memberships across accounts. Identity clustering for same verified phone/email in other groups."
      phase="ready"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, account…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
        >
          <option value="all">All verification</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
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
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <th className="text-left p-3 font-medium">Account</th>
                  <th className="text-left p-3 font-medium">Also in</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Contributions</th>
                  <th className="text-left p-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No memberships found
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
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
                          {formatCurrency(m.contribution_total)}
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
        </>
      )}
    </SectionPage>
  );
}

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ContributionTable } from "@/components/catalog/ContributionTable";
import { adminApi } from "@/services/admin.api";
import { formatCurrency, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const [contribScope, setContribScope] = useState<"account" | "all">("account");

  const { data: member, isLoading, error } = useQuery({
    queryKey: ["admin-member", id, contribScope],
    queryFn: () => adminApi.getMember(id!, contribScope),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SectionPage title="Membership detail" description="Loading…">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SectionPage>
    );
  }

  if (error || !member) {
    return (
      <SectionPage title="Membership detail" description="Not found">
        <Button asChild variant="outline" size="sm">
          <Link to="/members">← All members</Link>
        </Button>
        <Card className="mt-4">
          <CardContent className="pt-6">
            <EmptyState
              illustration="files-missing"
              description={error instanceof Error ? error.message : "Member not found"}
            />
          </CardContent>
        </Card>
      </SectionPage>
    );
  }

  const accountContributions =
    contribScope === "account"
      ? member.contributions.filter((c) => c.account_id === member.account_id)
      : member.contributions;

  return (
    <SectionPage
      title={`${member.full_name} · ${member.account_name || "Unnamed account"}`}
      description="Membership detail — read-only for staff."
      phase="ready"
    >
      <Button asChild variant="outline" size="sm">
        <Link to="/members">← All members</Link>
      </Button>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Phone" value={member.phone} />
            <Row label="Email" value={member.email || "—"} />
            <Row label="Membership #" value={member.membership_number || "—"} />
            <Row
              label="Verification"
              value={
                <StatusBadge status={member.is_active ? "active" : "inactive"} />
              }
            />
            <Row label="Joined" value={formatDate(member.created_at)} />
            <Row
              label="Confirmed total (this account)"
              value={formatCurrency(member.contribution_total)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parent account</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <Link
              to={`/accounts/${member.account_id}`}
              className="font-medium hover:underline"
            >
              {member.account_name || "Unnamed account"}
            </Link>
            <p className="font-mono text-xs text-muted-foreground mt-2">
              {member.account_id}
            </p>
          </CardContent>
        </Card>
      </div>

      {member.other_groups.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Also a member of</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {member.other_groups.map((g) => (
                <li key={g.member_id}>
                  <Link to={`/members/${g.member_id}`} className="hover:underline font-medium">
                    {g.full_name}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    · {g.account_name || "Unnamed account"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Contribution history</CardTitle>
          <div className="flex rounded-md border overflow-hidden text-xs">
            <button
              type="button"
              className={`px-3 py-1.5 ${contribScope === "account" ? "bg-muted font-medium" : ""}`}
              onClick={() => setContribScope("account")}
            >
              This account
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 ${contribScope === "all" ? "bg-muted font-medium" : ""}`}
              onClick={() => setContribScope("all")}
            >
              All groups
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <ContributionTable
            rows={accountContributions}
            showAccount={contribScope === "all"}
          />
        </CardContent>
      </Card>
    </SectionPage>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

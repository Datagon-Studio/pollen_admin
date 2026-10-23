import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminApi } from "@/services/admin.api";
import { formatCurrency, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

export default function ContributionDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: c, isLoading, error } = useQuery({
    queryKey: ["admin-contribution", id],
    queryFn: () => adminApi.getContribution(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SectionPage title="Contribution detail" description="Loading…">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SectionPage>
    );
  }

  if (error || !c) {
    return (
      <SectionPage title="Contribution detail" description="Not found">
        <Button asChild variant="outline" size="sm">
          <Link to="/contributions">← All contributions</Link>
        </Button>
        <Card className="mt-4">
          <CardContent className="pt-6">
            <EmptyState
              illustration="files-missing"
              description={error instanceof Error ? error.message : "Contribution not found"}
            />
          </CardContent>
        </Card>
      </SectionPage>
    );
  }

  return (
    <SectionPage
      title={formatCurrency(c.amount)}
      description={`${c.channel === "online" ? "Online" : "Manual"} contribution — read-only.`}
      phase="ready"
    >
      <Button asChild variant="outline" size="sm">
        <Link to="/contributions">← All contributions</Link>
      </Button>

      <Card className="mt-4 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Status">
            <StatusBadge
              status={
                c.status as "pending" | "confirmed" | "failed" | "reversed"
              }
            />
          </Row>
          <Row label="Amount" value={formatCurrency(c.amount)} />
          <Row label="Date received" value={formatDate(c.date_received)} />
          <Row label="Channel" value={c.channel === "online" ? "Online" : "Manual"} />
          <Row label="Payment method" value={c.payment_method || "—"} />
          <Row label="Paystack reference" value={c.payment_reference || "—"} />
          <Row label="Comment" value={c.comment || "—"} />
          <Row label="Recorded" value={formatDate(c.created_at)} />
          <Row label="Contribution ID">
            <span className="font-mono text-xs">{c.contribution_id}</span>
          </Row>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 mt-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to={`/accounts/${c.account_id}`}
              className="text-sm font-medium hover:underline"
            >
              {c.account_name || "Unnamed account"}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fund</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/funds/${c.fund_id}`} className="text-sm font-medium hover:underline">
              {c.fund_name || "Fund"}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Member</CardTitle>
          </CardHeader>
          <CardContent>
            {c.member_id ? (
              <Link
                to={`/members/${c.member_id}`}
                className="text-sm font-medium hover:underline"
              >
                {c.member_name || "Member"}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">Anonymous</span>
            )}
          </CardContent>
        </Card>
      </div>
    </SectionPage>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children ?? value}</span>
    </div>
  );
}

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

export default function FundDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: fund, isLoading, error } = useQuery({
    queryKey: ["admin-fund", id],
    queryFn: () => adminApi.getFund(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SectionPage title="Fund detail" description="Loading…">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SectionPage>
    );
  }

  if (error || !fund) {
    return (
      <SectionPage title="Fund detail" description="Not found">
        <Button asChild variant="outline" size="sm">
          <Link to="/funds">← All funds</Link>
        </Button>
        <Card className="mt-4">
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Fund not found"}
          </CardContent>
        </Card>
      </SectionPage>
    );
  }

  return (
    <SectionPage
      title={fund.fund_name}
      description={`Fund in ${fund.account_name || "unnamed account"} — read-only.`}
      phase="ready"
    >
      <Button asChild variant="outline" size="sm">
        <Link to="/funds">← All funds</Link>
      </Button>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fund info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Collected" value={formatCurrency(fund.amount_collected)} />
            <Row
              label="Goal"
              value={
                fund.fund_goal != null ? formatCurrency(fund.fund_goal) : "Not set"
              }
            />
            <Row label="Default amount" value={
              fund.default_amount != null
                ? formatCurrency(fund.default_amount)
                : "—"
            } />
            <Row label="Visibility" value={fund.is_public ? "Public" : "Private"} />
            <Row
              label="Status"
              value={
                <StatusBadge status={fund.is_active ? "active" : "inactive"} />
              }
            />
            <Row label="Created" value={formatDate(fund.created_at)} />
            {fund.description && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground mb-1">Description</p>
                <p>{fund.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parent account</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <Link
              to={`/accounts/${fund.account_id}`}
              className="font-medium hover:underline"
            >
              {fund.account_name || "Unnamed account"}
            </Link>
            <p className="font-mono text-xs text-muted-foreground mt-2">
              {fund.account_id}
            </p>
            <p className="text-muted-foreground mt-4 text-xs">
              Settlement requests — coming when settlement API ships
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Recent contributions</CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionTable rows={fund.contributions} />
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

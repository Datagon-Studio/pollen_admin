import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { adminApi } from "@/services/admin.api";
import { formatCurrency } from "@/lib/format";

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
  });

  if (isLoading) {
    return (
      <SectionPage title="Dashboard" description="Platform-wide pulse">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SectionPage>
    );
  }

  if (error || !data) {
    return (
      <SectionPage title="Dashboard" description="Platform-wide pulse">
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load dashboard"}
          </CardContent>
        </Card>
      </SectionPage>
    );
  }

  return (
    <SectionPage
      title="Dashboard"
      description="Platform-wide pulse: accounts, collections, and ops shortcuts."
      phase="ready"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total accounts" value={String(data.totalAccounts)} />
        <MetricCard label="Active accounts" value={String(data.activeAccounts)} />
        <MetricCard label="Active funds" value={`${data.activeFunds} / ${data.totalFunds}`} />
        <MetricCard label="Collected (all time)" value={formatCurrency(data.totalCollected)} />
        <MetricCard
          label="Collected this month"
          value={formatCurrency(data.collectedThisMonth)}
        />
        <MetricCard label="Inactive accounts" value={String(data.inactiveAccounts)} />
        <MetricCard label="Suspended accounts" value={String(data.suspendedAccounts)} />
        <MetricCard
          label="Pending KYC"
          value={
            data.pendingKycCount > 0 ? (
              <Link to="/kyc" className="text-primary hover:underline">
                {data.pendingKycCount}
              </Link>
            ) : (
              "0"
            )
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">12-month collection trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendLineChart data={data.monthlyTrend} />
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-primary" />
              Total
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-foreground" />
              Online
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-px w-4 border-t border-dashed border-muted-foreground"
                aria-hidden
              />
              Manual
            </span>
          </div>
        </CardContent>
      </Card>
    </SectionPage>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

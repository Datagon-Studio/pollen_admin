import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi } from "@/services/admin.api";
import { formatCurrency, formatMonthKey } from "@/lib/format";

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

  const maxTrend = Math.max(...data.monthlyTrend.map((m) => m.total), 1);

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
          <div className="flex items-end gap-2 h-48 pt-4">
            {data.monthlyTrend.map((m) => {
              const heightPct = (m.total / maxTrend) * 100;
              const onlinePct = m.total > 0 ? (m.online / m.total) * 100 : 0;
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center gap-1 min-w-0"
                  title={`${formatMonthKey(m.month)}: ${formatCurrency(m.total)} (online ${formatCurrency(m.online)}, manual ${formatCurrency(m.manual)})`}
                >
                  <div
                    className="w-full rounded-t bg-muted overflow-hidden flex flex-col justify-end"
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  >
                    <div
                      className="w-full bg-primary/80"
                      style={{ height: `${onlinePct}%` }}
                    />
                    <div
                      className="w-full bg-primary/30 flex-1"
                      style={{ minHeight: m.manual > 0 ? "2px" : 0 }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {formatMonthKey(m.month)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-primary/80" /> Online
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-primary/30" /> Manual
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

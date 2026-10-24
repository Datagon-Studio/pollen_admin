import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Clock,
  FolderOpen,
  Landmark,
  Loader2,
  Scale,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendBarChart } from "@/components/charts/TrendLineChart";
import { SettlementRequestTable } from "@/components/settlements/SettlementRequestTable";
import { adminApi, type DashboardTrendRange } from "@/services/admin.api";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

const TREND_RANGES: Array<{ id: DashboardTrendRange; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "ytd", label: "YTD" },
  { id: "6m", label: "6 months" },
  { id: "12m", label: "12 months" },
];

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
  });
  const [settlementsOpen, setSettlementsOpen] = useState(true);
  const [trendRange, setTrendRange] = useState<DashboardTrendRange>("12m");
  const {
    data: trend,
    isLoading: trendLoading,
    isFetching: trendFetching,
    error: trendError,
  } = useQuery({
    queryKey: ["admin-dashboard-trend", trendRange],
    queryFn: () => adminApi.getCollectionTrend(trendRange),
    placeholderData: keepPreviousData,
  });
  const {
    data: pendingSettlements = [],
    isLoading: settlementsLoading,
    error: settlementsError,
  } = useQuery({
    queryKey: ["settlement-requests", "pending"],
    queryFn: () => adminApi.listSettlementRequests({ status: "pending" }),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Collected (all time)"
          value={formatCurrency(data.totalCollected)}
          icon={Wallet}
        />
        <StatCard
          title="Collected this month"
          value={formatCurrency(data.collectedThisMonth)}
          icon={CalendarDays}
        />
        <StatCard
          title="Total settlement"
          value={formatCurrency(data.totalSettlement)}
          icon={Landmark}
        />
        <StatCard
          title="Current balance"
          value={formatCurrency(data.currentBalance)}
          icon={Scale}
        />
        <StatCard
          title="Accounts"
          value={String(data.totalAccounts)}
          subtitle={`${data.activeAccounts} active · ${data.inactiveAccounts} inactive · ${data.suspendedAccounts} suspended`}
          icon={Building2}
        />
        <StatCard
          title="Active funds"
          value={String(data.activeFunds)}
          subtitle={`of ${data.totalFunds} total`}
          icon={FolderOpen}
        />
        <StatCard
          title="Pending KYC"
          value={String(data.pendingKycCount)}
          icon={ShieldCheck}
          href={data.pendingKycCount > 0 ? "/kyc" : undefined}
        />
        <StatCard
          title="Pending settlements"
          value={settlementsLoading ? "…" : String(pendingSettlements.length)}
          icon={Clock}
          href={!settlementsLoading && pendingSettlements.length > 0 ? "/settlements" : undefined}
        />
      </div>

      <Card>
        <CardHeader className="p-0">
          <CardTitle className="text-base">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 p-6 text-left hover:bg-muted/40"
              aria-expanded={settlementsOpen}
              aria-controls="pending-settlement-requests"
              onClick={() => setSettlementsOpen((open) => !open)}
            >
              <span>Pending settlement requests</span>
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  settlementsOpen && "rotate-90",
                )}
                aria-hidden
              />
            </button>
          </CardTitle>
        </CardHeader>
        {settlementsOpen && (
        <CardContent id="pending-settlement-requests">
          {settlementsLoading && (
            <p className="text-sm text-muted-foreground">Loading requests…</p>
          )}
          {settlementsError && (
            <p className="text-sm text-destructive">
              {settlementsError instanceof Error
                ? settlementsError.message
                : "Failed to load settlement requests"}
            </p>
          )}
          {!settlementsLoading && !settlementsError && pendingSettlements.length === 0 && (
            <EmptyState
              illustration="signed-document"
              size="table"
              description="No pending settlement requests."
            />
          )}
          {pendingSettlements.length > 0 && (
            <SettlementRequestTable requests={pendingSettlements} />
          )}
        </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Collection trend</CardTitle>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Collection range">
            {TREND_RANGES.map((option) => {
              const selected = trendRange === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTrendRange(option.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {trendError && (
            <p className="text-sm text-destructive">
              {trendError instanceof Error ? trendError.message : "Failed to load collection trend"}
            </p>
          )}
          {trendLoading && !trend && (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {trend && (
            <div className={cn(trendFetching && "opacity-60")}>
              <TrendBarChart
                data={trend.trend}
                title={`Collections for ${TREND_RANGES.find((option) => option.id === trend.range)?.label ?? "the selected range"}`}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-foreground" />
              Online
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
              Manual
            </span>
          </div>
        </CardContent>
      </Card>
    </SectionPage>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  href?: string;
}) {
  const valueClass = cn(
    "font-semibold text-foreground tabular-nums",
    value.length >= 15 ? "text-lg" : value.length >= 12 ? "text-xl" : "text-2xl",
  );
  return (
    <div className="bg-card rounded-lg border border-border border-t-2 border-t-foreground p-5 transition-shadow hover:shadow-sm">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-foreground/10">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
        </div>
        {href ? (
          <Link to={href} className={cn(valueClass, "inline-block hover:underline")}>
            {value}
          </Link>
        ) : (
          <p className={valueClass}>{value}</p>
        )}
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

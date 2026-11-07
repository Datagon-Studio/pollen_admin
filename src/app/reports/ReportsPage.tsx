import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronRight,
  FolderOpen,
  HandCoins,
  ListChecks,
  Loader2,
  Monitor,
  Receipt,
  Scale,
  Search,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SectionPage } from "@/components/pages/SectionPage";
import { TrendBarChart, TrendLineChart } from "@/components/charts/TrendLineChart";
import { ContributionTable } from "@/components/catalog/ContributionTable";
import {
  ReportPeriodPicker,
  buildReportQuery,
  showingText,
  type AppliedFilter,
} from "@/components/reports/ReportPeriodPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  adminApi,
  type AdminContributionRow,
  type DashboardTrendRange,
  type ReportDuration,
} from "@/services/admin.api";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const PRESET_DURATION: Record<Extract<AppliedFilter, { kind: "preset" }>["preset"], ReportDuration> = {
  "30days": "30d",
  "3months": "3m",
  "6months": "6m",
  "12months": "12m",
};

const SELECT_CLASS =
  "h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[10.5rem]";

type ChartKind = "bar" | "line";

const TREND_RANGES: Array<{ id: DashboardTrendRange; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "ytd", label: "YTD" },
  { id: "6m", label: "6 months" },
  { id: "12m", label: "12 months" },
];

function reportParams(filter: AppliedFilter) {
  if (filter.kind === "preset") {
    return { duration: PRESET_DURATION[filter.preset] };
  }
  const query = buildReportQuery(filter);
  return {
    duration: "custom" as const,
    dateFrom: query.startDate,
    dateTo: query.endDate,
    month: query.month,
    years: query.years,
  };
}

export default function ReportsPage() {
  const [applied, setApplied] = useState<AppliedFilter>({ kind: "preset", preset: "30days" });
  const [trendOpen, setTrendOpen] = useState(true);
  const [recordsOpen, setRecordsOpen] = useState(true);
  const [chartKind, setChartKind] = useState<ChartKind>("bar");
  const [trendRange, setTrendRange] = useState<DashboardTrendRange>("month");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const params = reportParams(applied);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["admin-report", params],
    queryFn: () => adminApi.getReport(params),
  });
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
  const trendLabel = TREND_RANGES.find((option) => option.id === trendRange)?.label ?? "the selected range";

  const accountOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const row of data?.records ?? []) {
      if (!names.has(row.account_id)) {
        names.set(row.account_id, row.account_name || "Unnamed account");
      }
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.records ?? []).filter((row) => {
      if (accountFilter !== "all" && row.account_id !== accountFilter) return false;
      if (channelFilter !== "all" && row.channel !== channelFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        row.member_name ?? "",
        row.payment_reference ?? "",
        row.account_name ?? "",
        row.fund_name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data?.records, search, accountFilter, channelFilter, statusFilter]);

  const hasRecordFilters =
    search.trim() !== "" ||
    accountFilter !== "all" ||
    channelFilter !== "all" ||
    statusFilter !== "all";

  const clearRecordFilters = () => {
    setSearch("");
    setAccountFilter("all");
    setChannelFilter("all");
    setStatusFilter("all");
  };

  return (
    <SectionPage
      title="Reports"
      description="Platform collections and the contribution records inside a chosen period."
      phase="ready"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{showingText(applied)}</p>
        <div className="flex items-center gap-2">
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <ReportPeriodPicker applied={applied} onApply={setApplied} />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load report"}
          </CardContent>
        </Card>
      )}

      {data && (
        <div className={isFetching ? "space-y-6 opacity-70" : "space-y-6"}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <StatCard title="Collected" value={formatCurrency(data.summary.collected)} icon={Wallet} />
            <StatCard title="Online" value={formatCurrency(data.summary.online)} icon={Monitor} />
            <StatCard title="Manual" value={formatCurrency(data.summary.manual)} icon={HandCoins} />
            <StatCard title="Expenses" value={formatCurrency(data.summary.expenses)} icon={Receipt} />
            <StatCard title="Net" value={formatCurrency(data.summary.net)} icon={Scale} />
            <StatCard
              title="Confirmed contributions"
              value={String(data.summary.contributionCount)}
              icon={ListChecks}
            />
            <StatCard title="Accounts" value={String(data.summary.accountCount)} icon={Building2} />
            <StatCard title="Funds" value={String(data.summary.fundCount)} icon={FolderOpen} />
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">
                <button
                  type="button"
                  className="flex items-center gap-2 text-left"
                  aria-expanded={trendOpen}
                  aria-controls="report-collection-trend"
                  onClick={() => setTrendOpen((open) => !open)}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      trendOpen && "rotate-90",
                    )}
                    aria-hidden
                  />
                  Collection trend
                </button>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
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
              <div className="flex flex-wrap gap-1" role="group" aria-label="Chart type">
                {(
                  [
                    { id: "bar", label: "Bar" },
                    { id: "line", label: "Line" },
                  ] as const
                ).map((option) => {
                  const selected = chartKind === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setChartKind(option.id)}
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
              </div>
            </CardHeader>
            {trendOpen && (
              <CardContent id="report-collection-trend">
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
                {trend && trend.trend.length === 0 && (
                  <EmptyState
                    illustration="growth-chart"
                    size="table"
                    description="No confirmed collections in this period."
                  />
                )}
                {trend && trend.trend.length > 0 && (
                  <div className={cn(trendFetching && "opacity-60")}>
                    {chartKind === "bar" ? (
                      <TrendBarChart data={trend.trend} title={`Collections for ${trendLabel}`} />
                    ) : (
                      <TrendLineChart data={trend.trend} title={`Collections for ${trendLabel}`} />
                    )}
                    {chartKind === "bar" ? (
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm bg-foreground" />
                          Online
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                          Manual
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
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
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="p-0">
              <CardTitle className="text-base">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 p-6 text-left hover:bg-muted/40"
                  aria-expanded={recordsOpen}
                  aria-controls="report-records"
                  onClick={() => setRecordsOpen((open) => !open)}
                >
                  <span>Records</span>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      recordsOpen && "rotate-90",
                    )}
                    aria-hidden
                  />
                </button>
              </CardTitle>
            </CardHeader>
            {recordsOpen && (
              <CardContent id="report-records" className="space-y-3">
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search member, reference, account, fund…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <select
                      aria-label="Filter by account"
                      className={SELECT_CLASS}
                      value={accountFilter}
                      onChange={(event) => setAccountFilter(event.target.value)}
                    >
                      <option value="all">All accounts</option>
                      {accountOptions.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by channel"
                      className={SELECT_CLASS}
                      value={channelFilter}
                      onChange={(event) => setChannelFilter(event.target.value)}
                    >
                      <option value="all">All channels</option>
                      <option value="online">Online</option>
                      <option value="offline">Manual</option>
                    </select>
                    <select
                      aria-label="Filter by status"
                      className={SELECT_CLASS}
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="all">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="failed">Failed</option>
                      <option value="reversed">Reversed</option>
                    </select>
                    {hasRecordFilters && (
                      <Button type="button" variant="ghost" onClick={clearRecordFilters}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{recordSummary(data, filteredRecords)}</p>
                <ContributionTable
                  rows={filteredRecords}
                  showAccount
                  emptyMessage={
                    hasRecordFilters
                      ? "No records match these filters."
                      : "No contribution records in this period."
                  }
                  emptyIllustration="file-searching"
                />
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </SectionPage>
  );
}

function recordSummary(
  data: { recordCount: number; recordsLimited: boolean; records: AdminContributionRow[] },
  filtered: AdminContributionRow[],
): string {
  if (data.recordCount === 0) return "No contribution records in this period.";
  if (filtered.length !== data.records.length) {
    return `Showing ${filtered.length} of ${data.records.length} loaded records.`;
  }
  if (data.recordsLimited) {
    return `Showing the latest ${data.records.length} of ${data.recordCount} records.`;
  }
  return `Showing ${data.recordCount} record${data.recordCount === 1 ? "" : "s"}.`;
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-border border-t-2 border-t-foreground bg-card p-5 transition-shadow hover:shadow-sm">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-foreground/10">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
        </div>
        <p
          className={cn(
            "font-semibold tabular-nums text-foreground",
            value.length >= 15 ? "text-lg" : value.length >= 12 ? "text-xl" : "text-2xl",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

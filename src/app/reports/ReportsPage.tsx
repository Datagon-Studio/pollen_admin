import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { SectionPage } from "@/components/pages/SectionPage";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { ContributionTable } from "@/components/catalog/ContributionTable";
import {
  ReportPeriodPicker,
  buildReportQuery,
  showingText,
  type AppliedFilter,
} from "@/components/reports/ReportPeriodPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, type ReportDuration } from "@/services/admin.api";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

const PRESET_DURATION: Record<Extract<AppliedFilter, { kind: "preset" }>["preset"], ReportDuration> = {
  "30days": "30d",
  "3months": "3m",
  "6months": "6m",
  "12months": "12m",
};

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
  const params = reportParams(applied);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["admin-report", params],
    queryFn: () => adminApi.getReport(params),
  });

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Collected" value={formatCurrency(data.summary.collected)} />
            <MetricCard label="Online" value={formatCurrency(data.summary.online)} />
            <MetricCard label="Manual" value={formatCurrency(data.summary.manual)} />
            <MetricCard label="Expenses" value={formatCurrency(data.summary.expenses)} />
            <MetricCard label="Net" value={formatCurrency(data.summary.net)} />
            <MetricCard label="Confirmed contributions" value={String(data.summary.contributionCount)} />
            <MetricCard label="Accounts" value={String(data.summary.accountCount)} />
            <MetricCard label="Funds" value={String(data.summary.fundCount)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Collection trend</CardTitle>
            </CardHeader>
            <CardContent>
              {data.trend.length === 0 ? (
                <EmptyState
                  illustration="growth-chart"
                  size="table"
                  description="No confirmed collections in this period."
                />
              ) : (
                <>
                  <TrendLineChart data={data.trend} title="Collections for the selected duration" />
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
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {data.recordCount === 0
                  ? "No contribution records in this period."
                  : data.recordsLimited
                    ? `Showing the latest ${data.records.length} of ${data.recordCount} records.`
                    : `Showing ${data.recordCount} record${data.recordCount === 1 ? "" : "s"}.`}
              </p>
              <ContributionTable
                rows={data.records}
                showAccount
                emptyMessage="No contribution records in this period."
                emptyIllustration="file-searching"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </SectionPage>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

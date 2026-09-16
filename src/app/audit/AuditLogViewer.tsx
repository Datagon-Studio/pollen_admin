import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AuditLogTable } from "@/components/audit/AuditLogTable";
import { adminApi } from "@/services/admin.api";

const categories = [
  { value: "", label: "All categories" },
  { value: "PAYMENT", label: "Payment" },
  { value: "CONTRIBUTION", label: "Contribution" },
  { value: "MEMBER", label: "Member" },
  { value: "FUND", label: "Fund" },
  { value: "ACCOUNT", label: "Account" },
  { value: "AUTH", label: "Auth" },
  { value: "SYSTEM", label: "System" },
];

export default function AuditLogViewer() {
  const [category, setCategory] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["admin-audit-logs", category, accountFilter],
    queryFn: () =>
      adminApi.listAuditLogs({
        category: category || undefined,
        accountId: accountFilter.trim() || undefined,
        limit: 100,
      }),
  });

  return (
    <SectionPage
      title="Audit log"
      description="Platform-wide activity trail. Filter by account ID for account-scoped events."
      phase="ready"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by account ID (optional)…"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="pl-9 font-mono text-sm"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.value || "all"} value={c.value}>
              {c.label}
            </option>
          ))}
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
            {error instanceof Error ? error.message : "Failed to load audit log"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-muted-foreground">{logs.length} events (latest 100)</p>
          <AuditLogTable logs={logs} showAccount={!accountFilter.trim()} />
        </>
      )}
    </SectionPage>
  );
}

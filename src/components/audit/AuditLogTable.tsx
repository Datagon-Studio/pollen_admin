import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AuditLogEntry } from "@/services/admin.api";

const categoryLabels: Record<string, string> = {
  AUTH: "Auth",
  MEMBER: "Member",
  CONTRIBUTION: "Contribution",
  FUND: "Fund",
  EXPENSE: "Expense",
  ACCOUNT: "Account",
  PAYMENT: "Payment",
  SYSTEM: "System",
};

type AuditLogTableProps = {
  logs: AuditLogEntry[];
  showAccount?: boolean;
  emptyMessage?: string;
};

export function AuditLogTable({
  logs,
  showAccount = false,
  emptyMessage = "No audit events",
}: AuditLogTableProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>;
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="text-left p-3 font-medium">When</th>
            <th className="text-left p-3 font-medium">Category</th>
            <th className="text-left p-3 font-medium">Action</th>
            {showAccount && <th className="text-left p-3 font-medium">Account</th>}
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.audit_id} className="border-b last:border-0 hover:bg-muted/30 align-top">
              <td className="p-3 whitespace-nowrap text-muted-foreground">
                {formatDate(log.created_at)}
              </td>
              <td className="p-3">
                {categoryLabels[log.action_category] || log.action_category}
              </td>
              <td className="p-3 font-mono text-xs">{log.action_type}</td>
              {showAccount && (
                <td className="p-3 font-mono text-xs text-muted-foreground max-w-[140px] truncate">
                  {log.account_id || "—"}
                </td>
              )}
              <td className="p-3">
                <StatusBadge
                  status={log.status === "success" ? "confirmed" : "failed"}
                  label={log.status}
                />
              </td>
              <td className="p-3 text-xs text-muted-foreground max-w-xs">
                {log.error_message ? (
                  <span className="text-destructive">{log.error_message}</span>
                ) : log.action_details ? (
                  <pre className="whitespace-pre-wrap break-all font-mono">
                    {JSON.stringify(log.action_details, null, 0).slice(0, 200)}
                    {JSON.stringify(log.action_details).length > 200 ? "…" : ""}
                  </pre>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

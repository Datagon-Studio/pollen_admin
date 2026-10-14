import { formatDate } from "@/lib/format";
import { useSortedRows } from "@/lib/table-sort";
import { SortableTh } from "@/components/ui/sortable-th";
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
  const logSort = useSortedRows(logs, (log, column) => {
    switch (column) {
      case "when":
        return log.created_at;
      case "category":
        return categoryLabels[log.action_category] || log.action_category;
      case "action":
        return log.action_type;
      case "account":
        return log.account_id || "";
      case "status":
        return log.status;
      case "details":
        return log.error_message || (log.action_details ? JSON.stringify(log.action_details) : "");
      default:
        return "";
    }
  });

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>;
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <SortableTh label="When" column="when" sortColumn={logSort.sortColumn} sortDirection={logSort.sortDirection} onSort={logSort.onSort} />
            <SortableTh label="Category" column="category" sortColumn={logSort.sortColumn} sortDirection={logSort.sortDirection} onSort={logSort.onSort} />
            <SortableTh label="Action" column="action" sortColumn={logSort.sortColumn} sortDirection={logSort.sortDirection} onSort={logSort.onSort} />
            {showAccount && (
              <SortableTh label="Account" column="account" sortColumn={logSort.sortColumn} sortDirection={logSort.sortDirection} onSort={logSort.onSort} />
            )}
            <SortableTh label="Status" column="status" sortColumn={logSort.sortColumn} sortDirection={logSort.sortDirection} onSort={logSort.onSort} />
            <SortableTh label="Details" column="details" sortColumn={logSort.sortColumn} sortDirection={logSort.sortDirection} onSort={logSort.onSort} />
          </tr>
        </thead>
        <tbody>
          {logSort.sorted.map((log) => (
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

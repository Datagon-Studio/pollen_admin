import { cn } from "@/lib/utils";

type StatusType =
  | "pending"
  | "confirmed"
  | "failed"
  | "reversed"
  | "active"
  | "inactive"
  | "suspended"
  | "verified"
  | "unverified"
  | "rejected";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  pending: "bg-warning/15 text-warning border-warning/40",
  confirmed: "bg-success/15 text-success border-success/40",
  failed: "bg-destructive/15 text-destructive border-destructive/40",
  reversed: "bg-muted text-muted-foreground border-border",
  active: "bg-success/15 text-success border-success/40",
  inactive: "bg-muted text-muted-foreground border-border",
  suspended: "bg-destructive/15 text-destructive border-destructive/40",
  verified: "bg-success/15 text-success border-success/40",
  unverified: "bg-muted text-muted-foreground border-border",
  rejected: "bg-destructive/15 text-destructive border-destructive/40",
};

const statusLabels: Record<StatusType, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
  reversed: "Reversed",
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  verified: "Verified",
  unverified: "Not verified",
  rejected: "Rejected",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border",
        statusStyles[status],
        className
      )}
    >
      {label || statusLabels[status]}
    </span>
  );
}

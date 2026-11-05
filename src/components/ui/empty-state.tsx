import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  auth: "h-[200px] max-w-[280px]",
  page: "h-[140px] max-w-[220px]",
  table: "h-24 max-w-[160px]",
} as const;

export type IllustrationName =
  | "two-factor-authentication"
  | "secure-password"
  | "forgot-password"
  | "empty-mailbox"
  | "file-searching"
  | "files-missing"
  | "growth-chart"
  | "data-input"
  | "collaboration"
  | "signed-document"
  | "action-successful"
  | "certification";

export type EmptyStateSize = keyof typeof sizes;

interface EmptyStateProps {
  illustration: IllustrationName;
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  size?: EmptyStateSize;
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  size = "page",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex w-full flex-col items-center text-center", className)}>
      <div className="mb-4 flex items-center justify-center rounded-2xl bg-[hsl(37_32%_91%)] px-6 py-4">
        <img
          src={`/illustrations/${illustration}.svg`}
          alt=""
          className={cn("w-auto object-contain", sizes[size])}
        />
      </div>
      {title ? (
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      ) : null}
      {description ? (
        <p className={cn("max-w-sm text-sm text-muted-foreground", title && "mt-1")}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex w-full justify-center">{action}</div> : null}
    </div>
  );
}

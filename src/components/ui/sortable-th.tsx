import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlphaSortDirection } from "@/lib/table-sort";

export function SortableTh({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  align = "left",
}: {
  label: string;
  column: string;
  sortColumn: string | null;
  sortDirection: AlphaSortDirection;
  onSort: (column: string) => void;
  align?: "left" | "right";
}) {
  const active = sortColumn === column;

  return (
    <th
      className={cn(
        "whitespace-nowrap p-3 font-medium",
        align === "right" ? "text-right" : "text-left"
      )}
      aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 font-medium hover:text-foreground",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {active ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}

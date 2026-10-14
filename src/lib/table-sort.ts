import { useMemo, useRef, useState } from "react";

export type SortableValue = string | number | boolean | Date | null | undefined;
export type AlphaSortDirection = "asc" | "desc";

export function compareSortValues(a: SortableValue, b: SortableValue): number {
  const aEmpty = isEmptySortValue(a);
  const bEmpty = isEmptySortValue(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);

  const aText = String(a);
  const bText = String(b);
  const aNum = parseSortNumber(aText);
  const bNum = parseSortNumber(bText);
  if (aNum != null && bNum != null) return aNum - bNum;

  return aText.localeCompare(bText, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function useSortedRows<T>(
  rows: T[],
  valueFor: (row: T, column: string) => SortableValue,
) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<AlphaSortDirection>("asc");
  const valueForRef = useRef(valueFor);
  valueForRef.current = valueFor;

  const onSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  };

  const sorted = useMemo(() => {
    if (!sortColumn) return rows;
    const ordered = [...rows].sort((a, b) =>
      compareSortValues(
        valueForRef.current(a, sortColumn),
        valueForRef.current(b, sortColumn),
      ),
    );
    return sortDirection === "desc" ? ordered.reverse() : ordered;
  }, [rows, sortColumn, sortDirection]);

  return { sorted, sortColumn, sortDirection, onSort };
}

function isEmptySortValue(value: SortableValue): boolean {
  return value == null || value === "" || value === "—";
}

function parseSortNumber(value: string): number | null {
  const match = value
    .trim()
    .match(/^(?:[A-Z]{2,3}\s+)?(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportTableToExcel,
  exportTableToPdf,
  type ExportColumn,
} from "@/lib/export";

type TableExportMenuProps<T> = {
  filename: string;
  title: string;
  subtitle?: string;
  sheetName?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  disabled?: boolean;
  size?: "default" | "sm";
  className?: string;
};

export function TableExportMenu<T>({
  filename,
  title,
  subtitle,
  sheetName,
  columns,
  rows,
  disabled = false,
  size = "sm",
  className,
}: TableExportMenuProps<T>) {
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);
  const empty = rows.length === 0;
  const isDisabled = disabled || empty || busy !== null;

  const run = (format: "excel" | "pdf") => {
    if (isDisabled && busy === null) return;
    setBusy(format);
    // Yield so the menu can close and the spinner can paint before heavy work.
    window.setTimeout(() => {
      try {
        const payload = { filename, title, subtitle, sheetName, columns, rows };
        if (format === "excel") exportTableToExcel(payload);
        else exportTableToPdf(payload);
      } finally {
        setBusy(null);
      }
    }, 0);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={isDisabled}
          className={className}
          aria-label={empty ? "Nothing to export" : "Export table"}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Download as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isDisabled}
          onSelect={(event) => {
            event.preventDefault();
            run("excel");
          }}
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isDisabled}
          onSelect={(event) => {
            event.preventDefault();
            run("pdf");
          }}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

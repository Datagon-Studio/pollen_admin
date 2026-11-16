import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type ExportCell = string | number | null | undefined;

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => ExportCell;
};

export type TableExportInput<T> = {
  filename: string;
  title: string;
  subtitle?: string;
  sheetName?: string;
  columns: ExportColumn<T>[];
  rows: T[];
};

function cellText(value: ExportCell): string {
  if (value == null) return "";
  return String(value);
}

function stamp(): string {
  return format(new Date(), "yyyy-MM-dd_HH-mm");
}

function safeFilename(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_");
}

function matrix<T>(columns: ExportColumn<T>[], rows: T[]): string[][] {
  return rows.map((row) => columns.map((column) => cellText(column.value(row))));
}

export function exportTableToExcel<T>({
  filename,
  sheetName = "Sheet1",
  columns,
  rows,
}: TableExportInput<T>): void {
  const header = columns.map((column) => column.header);
  const data = matrix(columns, rows);
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
  worksheet["!cols"] = columns.map((column, index) => {
    const longest = Math.max(
      column.header.length,
      ...data.map((line) => (line[index] ?? "").length)
    );
    return { wch: Math.min(Math.max(longest + 2, 10), 48) };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${safeFilename(filename)}_${stamp()}.xlsx`);
}

export function exportTableToPdf<T>({
  filename,
  title,
  subtitle,
  columns,
  rows,
}: TableExportInput<T>): void {
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });
  const marginX = 14;
  let cursorY = 16;

  doc.setFontSize(14);
  doc.text(title, marginX, cursorY);
  cursorY += 7;

  doc.setFontSize(9);
  doc.setTextColor(100);
  if (subtitle) {
    const lines = doc.splitTextToSize(subtitle, doc.internal.pageSize.getWidth() - marginX * 2);
    doc.text(lines, marginX, cursorY);
    cursorY += lines.length * 4 + 2;
  }
  doc.text(
    `Generated ${format(new Date(), "PPpp")} · ${rows.length} row${rows.length === 1 ? "" : "s"}`,
    marginX,
    cursorY
  );
  cursorY += 6;
  doc.setTextColor(0);

  autoTable(doc, {
    startY: cursorY,
    head: [columns.map((column) => column.header)],
    body: matrix(columns, rows),
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    margin: { left: marginX, right: marginX },
  });

  doc.save(`${safeFilename(filename)}_${stamp()}.pdf`);
}

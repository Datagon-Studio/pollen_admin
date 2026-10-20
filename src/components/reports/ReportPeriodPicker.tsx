import { useState } from "react";
import { format, parseISO, startOfMonth, subDays, subMonths, differenceInCalendarMonths } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 16 }, (_, index) => CURRENT_YEAR - index);
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PRESETS = [
  { key: "30days", label: "Last 30 Days", showing: "Showing the last 30 days" },
  { key: "3months", label: "Last 3 Months", showing: "Showing the last 3 months" },
  { key: "6months", label: "Last 6 Months", showing: "Showing the last 6 months" },
  { key: "12months", label: "Last 12 Months", showing: "Showing the last 12 months" },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];
type PickerTab = "quick" | "range" | "month";

export type AppliedFilter =
  | { kind: "preset"; preset: PresetKey }
  | { kind: "range"; startDate: string; endDate: string }
  | { kind: "monthYear"; month: number | null; years: number[] };

export type ReportQuery = {
  startDate: string;
  endDate: string;
  month?: number;
  years?: number[];
};

function yearPhrase(years: number[]): string {
  const sorted = (years.length ? years : [...YEAR_OPTIONS]).slice().sort((a, b) => a - b);
  if (years.length === 0) return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  if (sorted.length === 1) return String(sorted[0]);
  const contiguous = sorted.every((year, index) => index === 0 || year === sorted[index - 1] + 1);
  if (contiguous) return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  if (sorted.length === 2) return `${sorted[0]} and ${sorted[1]}`;
  if (sorted.length === 3) return `${sorted[0]}, ${sorted[1]}, and ${sorted[2]}`;
  return `${sorted.length} years`;
}

export function buttonLabel(filter: AppliedFilter): string {
  if (filter.kind === "preset") {
    return PRESETS.find((preset) => preset.key === filter.preset)?.label ?? "Last 30 Days";
  }
  if (filter.kind === "range") {
    return `${format(parseISO(filter.startDate), "MMM d, yyyy")} – ${format(parseISO(filter.endDate), "MMM d, yyyy")}`;
  }
  if (filter.month && filter.years.length === 1) {
    return `${MONTH_SHORT[filter.month - 1]} ${filter.years[0]}`;
  }
  if (filter.month && filter.years.length === 0) {
    return `${MONTH_SHORT[filter.month - 1]} · all years`;
  }
  if (filter.month) {
    return `${MONTH_SHORT[filter.month - 1]} · ${filter.years.length} years`;
  }
  return yearPhrase(filter.years);
}

export function showingText(filter: AppliedFilter): string {
  if (filter.kind === "preset") {
    return PRESETS.find((preset) => preset.key === filter.preset)?.showing ?? "Showing the last 30 days";
  }
  if (filter.kind === "range") {
    return `Showing ${format(parseISO(filter.startDate), "MMM d, yyyy")} – ${format(parseISO(filter.endDate), "MMM d, yyyy")}`;
  }
  const years = yearPhrase(filter.years);
  if (filter.month && filter.years.length === 0) {
    return `Showing ${MONTH_NAMES[filter.month - 1]} for ${years}`;
  }
  if (filter.month && filter.years.length === 1) {
    return `Showing ${MONTH_NAMES[filter.month - 1]} ${filter.years[0]}`;
  }
  if (filter.month) {
    return `Showing ${MONTH_NAMES[filter.month - 1]} in ${years}`;
  }
  return `Showing ${years}`;
}

export function buildReportQuery(filter: AppliedFilter): ReportQuery {
  const today = new Date();
  if (filter.kind === "preset") {
    const endDate = format(today, "yyyy-MM-dd");
    if (filter.preset === "30days") {
      return { startDate: format(subDays(today, 29), "yyyy-MM-dd"), endDate };
    }
    const count = filter.preset === "3months" ? 3 : filter.preset === "6months" ? 6 : 12;
    return {
      startDate: format(startOfMonth(subMonths(today, count - 1)), "yyyy-MM-dd"),
      endDate,
    };
  }
  if (filter.kind === "range") {
    return { startDate: filter.startDate, endDate: filter.endDate };
  }

  const years = (filter.years.length ? filter.years : YEAR_OPTIONS).slice().sort((a, b) => a - b);
  const contiguous = years.every((year, index) => index === 0 || year === years[index - 1] + 1);
  return {
    startDate: `${years[0]}-01-01`,
    endDate: `${years[years.length - 1]}-12-31`,
    ...(filter.month ? { month: filter.month } : {}),
    ...(contiguous ? {} : { years }),
  };
}

export function ReportPeriodPicker({
  applied,
  onApply,
}: {
  applied: AppliedFilter;
  onApply: (filter: AppliedFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PickerTab>("quick");
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const [draftMonth, setDraftMonth] = useState("all");
  const [draftYears, setDraftYears] = useState<number[]>([]);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);

  const syncDraft = (filter: AppliedFilter) => {
    setRangeError(null);
    setPeriodError(null);
    if (filter.kind === "range") {
      setTab("range");
      setDraftRange({ from: parseISO(filter.startDate), to: parseISO(filter.endDate) });
      setDraftMonth("all");
      setDraftYears([]);
      return;
    }
    if (filter.kind === "monthYear") {
      setTab("month");
      setDraftRange(undefined);
      setDraftMonth(filter.month ? String(filter.month) : "all");
      setDraftYears(filter.years);
      return;
    }
    setTab("quick");
    setDraftRange(undefined);
    setDraftMonth("all");
    setDraftYears([]);
  };

  const applyPreset = (preset: PresetKey) => {
    onApply({ kind: "preset", preset });
    setOpen(false);
  };

  const applyRange = () => {
    if (!draftRange?.from || !draftRange.to) {
      setRangeError("Pick a start date and an end date.");
      return;
    }
    const from = draftRange.from <= draftRange.to ? draftRange.from : draftRange.to;
    const to = draftRange.from <= draftRange.to ? draftRange.to : draftRange.from;
    if (differenceInCalendarMonths(to, from) > 60) {
      setRangeError("Choose a range of 5 years or less.");
      return;
    }
    onApply({
      kind: "range",
      startDate: format(from, "yyyy-MM-dd"),
      endDate: format(to, "yyyy-MM-dd"),
    });
    setOpen(false);
  };

  const applyMonthYear = () => {
    const month = draftMonth === "all" ? null : Number(draftMonth);
    if (!month && draftYears.length === 0) {
      setPeriodError("Choose a month, one or more years, or both.");
      return;
    }
    if (!month && draftYears.length > 3) {
      setPeriodError("Select a month when comparing more than 3 years.");
      return;
    }
    onApply({
      kind: "monthYear",
      month,
      years: draftYears.slice().sort((a, b) => a - b),
    });
    setOpen(false);
  };

  const toggleYear = (year: number) => {
    setPeriodError(null);
    setDraftYears((current) =>
      current.includes(year) ? current.filter((value) => value !== year) : [...current, year].sort((a, b) => b - a)
    );
  };

  const rangeSummary = draftRange?.from
    ? draftRange.to
      ? `${format(draftRange.from, "MMM d, yyyy")} – ${format(draftRange.to, "MMM d, yyyy")}`
      : `${format(draftRange.from, "MMM d, yyyy")} – pick an end date`
    : "Pick a start date, then an end date.";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) syncDraft(applied);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-[260px] justify-start"
          aria-label={`Report period: ${buttonLabel(applied)}`}
        >
          <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">{buttonLabel(applied)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] max-h-[min(32rem,calc(100vh-6rem))] max-w-[calc(100vw-2rem)] overflow-y-auto p-3 bg-card border-border"
      >
        <div className="grid h-9 w-full grid-cols-3 rounded-md bg-muted p-1 text-muted-foreground">
          {(
            [
              ["quick", "Quick"],
              ["range", "Date range"],
              ["month", "Month / year"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={cn(
                "inline-flex items-center justify-center rounded-sm px-2 text-xs font-medium transition-all",
                tab === value ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"
              )}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "quick" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                size="sm"
                variant={applied.kind === "preset" && applied.preset === preset.key ? "default" : "outline"}
                onClick={() => applyPreset(preset.key)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        {tab === "range" && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">{rangeSummary}</p>
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={(range) => {
                setDraftRange(range);
                setRangeError(null);
              }}
              defaultMonth={draftRange?.from}
              numberOfMonths={1}
              className="p-0"
            />
            {rangeError && <p className="text-xs text-destructive">{rangeError}</p>}
            <Button type="button" size="sm" className="w-full" onClick={applyRange}>
              Apply range
            </Button>
          </div>
        )}

        {tab === "month" && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Choose a month, one or more years, or both. A month with no year covers every year shown.
            </p>
            <div>
              <p className="mb-2 text-xs font-medium text-foreground">Month</p>
              <div className="grid grid-cols-4 gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={draftMonth === "all" ? "default" : "outline"}
                  className="col-span-4 h-8"
                  onClick={() => {
                    setDraftMonth("all");
                    setPeriodError(null);
                  }}
                >
                  All months
                </Button>
                {MONTH_SHORT.map((label, index) => {
                  const value = String(index + 1);
                  return (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={draftMonth === value ? "default" : "outline"}
                      className="h-8 px-2"
                      onClick={() => {
                        setDraftMonth(value);
                        setPeriodError(null);
                      }}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">Years</p>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    setPeriodError(null);
                    setDraftYears((current) => (current.length === YEAR_OPTIONS.length ? [] : [...YEAR_OPTIONS]));
                  }}
                >
                  {draftYears.length === YEAR_OPTIONS.length ? "Clear years" : "All years"}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {YEAR_OPTIONS.map((year) => (
                  <Button
                    key={year}
                    type="button"
                    size="sm"
                    variant={draftYears.includes(year) ? "default" : "outline"}
                    className="h-8 px-2"
                    onClick={() => toggleYear(year)}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </div>
            {periodError && <p className="text-xs text-destructive">{periodError}</p>}
            <Button type="button" size="sm" className="w-full" onClick={applyMonthYear}>
              Apply month / year
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

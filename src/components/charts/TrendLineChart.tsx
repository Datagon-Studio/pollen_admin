import { useId, useMemo, useState } from "react";
import { formatCurrency, formatMonthKey } from "@/lib/format";

export interface TrendPoint {
  month: string;
  online: number;
  manual: number;
  total: number;
}

const VIEW_W = 720;
const VIEW_H = 220;
const PAD = { top: 16, right: 36, bottom: 32, left: 44 };

function niceScale(maxValue: number): { max: number; ticks: number[] } {
  if (maxValue <= 0) return { max: 1, ticks: [0, 1] };
  const raw = maxValue / 4;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
  const tickCount = Math.max(1, Math.ceil(maxValue / step));
  const max = tickCount * step;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * step);
  return { max, ticks };
}

function formatAxisAmount(amount: number): string {
  if (amount === 0) return "0";
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(amount >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return String(Math.round(amount));
}

function polyline(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
}

export function TrendLineChart({ data }: { data: TrendPoint[] }) {
  const labelId = useId();
  const descId = useId();
  const [active, setActive] = useState<number | null>(null);

  const chart = useMemo(() => {
    const innerW = VIEW_W - PAD.left - PAD.right;
    const innerH = VIEW_H - PAD.top - PAD.bottom;
    const { max, ticks: tickValues } = niceScale(Math.max(...data.map((d) => d.total), 0));
    const n = Math.max(data.length - 1, 1);
    const xs = data.map((_, i) => PAD.left + (i / n) * innerW);
    const yOf = (v: number) => PAD.top + innerH - (v / max) * innerH;
    const ticks = tickValues.map((value) => ({
      value,
      y: yOf(value),
    }));
    return {
      innerW,
      innerH,
      max,
      xs,
      ticks,
      online: data.map((d) => yOf(d.online)),
      manual: data.map((d) => yOf(d.manual)),
      total: data.map((d) => yOf(d.total)),
      yOf,
    };
  }, [data]);

  const nearestIndex = (clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VIEW_W;
    let best = 0;
    let bestDist = Infinity;
    chart.xs.forEach((px, i) => {
      const dist = Math.abs(px - x);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    });
    return best;
  };

  const point = active != null ? data[active] : null;
  const tooltipLeft =
    active != null ? (chart.xs[active] / VIEW_W) * 100 : 0;

  return (
    <div className="relative">
      <svg
        role="img"
        aria-labelledby={labelId}
        aria-describedby={descId}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-56 select-none"
        tabIndex={0}
        onMouseMove={(e) => setActive(nearestIndex(e.clientX, e.currentTarget))}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive((prev) => prev ?? data.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setActive((prev) => Math.min((prev ?? -1) + 1, data.length - 1));
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            setActive((prev) => Math.max((prev ?? data.length) - 1, 0));
          }
        }}
      >
        <title id={labelId}>12-month collection trend</title>
        <desc id={descId}>
          Line chart of total, online, and manual collections by month. Use left
          and right arrows to inspect each month.
        </desc>

        {chart.ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD.left}
              x2={VIEW_W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={tick.y + 3}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {formatAxisAmount(tick.value)}
            </text>
          </g>
        ))}

        {active != null && (
          <line
            x1={chart.xs[active]}
            x2={chart.xs[active]}
            y1={PAD.top}
            y2={VIEW_H - PAD.bottom}
            className="stroke-foreground/20"
            strokeWidth={1}
          />
        )}

        <path
          d={`${polyline(chart.xs, chart.total)} L${chart.xs[chart.xs.length - 1].toFixed(1)},${PAD.top + chart.innerH} L${chart.xs[0].toFixed(1)},${PAD.top + chart.innerH} Z`}
          className="fill-primary/15"
        />
        <path
          d={polyline(chart.xs, chart.total)}
          fill="none"
          className="stroke-primary"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={polyline(chart.xs, chart.online)}
          fill="none"
          className="stroke-foreground"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={polyline(chart.xs, chart.manual)}
          fill="none"
          className="stroke-muted-foreground"
          strokeWidth={1.75}
          strokeDasharray="5 4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => {
          const isActive = active === i;
          return (
            <g key={d.month}>
              <circle
                cx={chart.xs[i]}
                cy={chart.total[i]}
                r={isActive ? 4.5 : 3}
                className="fill-primary stroke-background"
                strokeWidth={1.5}
              />
              <circle
                cx={chart.xs[i]}
                cy={chart.online[i]}
                r={isActive ? 3.5 : 2.25}
                className="fill-foreground stroke-background"
                strokeWidth={1}
              />
              <rect
                x={chart.xs[i] - (isActive ? 3 : 2)}
                y={chart.manual[i] - (isActive ? 3 : 2)}
                width={isActive ? 6 : 4}
                height={isActive ? 6 : 4}
                className="fill-muted-foreground stroke-background"
                strokeWidth={1}
              />
              <text
                x={chart.xs[i]}
                y={VIEW_H - 10}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {formatMonthKey(d.month)}
              </text>
            </g>
          );
        })}
      </svg>

      {point && active != null && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-44 rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
          style={{
            left: `clamp(0.5rem, calc(${tooltipLeft}% - 5.5rem), calc(100% - 11.5rem))`,
          }}
        >
          <p className="font-medium mb-1.5">{formatMonthKey(point.month)}</p>
          <dl className="space-y-1">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="tabular-nums font-medium">{formatCurrency(point.total)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Online</dt>
              <dd className="tabular-nums">{formatCurrency(point.online)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Manual</dt>
              <dd className="tabular-nums">{formatCurrency(point.manual)}</dd>
            </div>
          </dl>
        </div>
      )}

      <table className="sr-only">
        <caption>Monthly collections</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Total</th>
            <th>Online</th>
            <th>Manual</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{formatMonthKey(d.month)}</td>
              <td>{formatCurrency(d.total)}</td>
              <td>{formatCurrency(d.online)}</td>
              <td>{formatCurrency(d.manual)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

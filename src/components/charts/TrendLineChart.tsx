import { useId, useMemo, useState } from "react";
import { formatCurrency, formatMonthKey } from "@/lib/format";

export interface TrendPoint {
  month: string;
  label?: string;
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

function roundedTopBar(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0 || w <= 0) return "";
  const radius = Math.min(r, w / 2, h / 2);
  const right = x + w;
  const bottom = y + h;
  return [
    `M${x.toFixed(1)},${bottom.toFixed(1)}`,
    `V${(y + radius).toFixed(1)}`,
    `Q${x.toFixed(1)},${y.toFixed(1)} ${(x + radius).toFixed(1)},${y.toFixed(1)}`,
    `H${(right - radius).toFixed(1)}`,
    `Q${right.toFixed(1)},${y.toFixed(1)} ${right.toFixed(1)},${(y + radius).toFixed(1)}`,
    `V${bottom.toFixed(1)}`,
    "Z",
  ].join(" ");
}

function pointLabel(point: TrendPoint): string {
  return point.label || formatMonthKey(point.month);
}

export function TrendLineChart({
  data,
  title = "12-month collection trend",
}: {
  data: TrendPoint[];
  title?: string;
}) {
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
        <title id={labelId}>{title}</title>
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
              {data.length <= 12 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1 ? (
                <text
                  x={chart.xs[i]}
                  y={VIEW_H - 10}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {pointLabel(d)}
                </text>
              ) : null}
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
          <p className="font-medium mb-1.5">{pointLabel(point)}</p>
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
              <td>{pointLabel(d)}</td>
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

export function TrendBarChart({
  data,
  title = "12-month collection trend",
}: {
  data: TrendPoint[];
  title?: string;
}) {
  const labelId = useId();
  const descId = useId();
  const [active, setActive] = useState<number | null>(null);

  const chart = useMemo(() => {
    const innerW = VIEW_W - PAD.left - PAD.right;
    const innerH = VIEW_H - PAD.top - PAD.bottom;
    const { max, ticks: tickValues } = niceScale(Math.max(0, ...data.map((d) => d.total)));
    const count = Math.max(data.length, 1);
    const slot = innerW / count;
    const barW = Math.min(36, slot * 0.62);
    const baseline = PAD.top + innerH;
    const yOf = (v: number) => baseline - (v / max) * innerH;
    const heightOf = (v: number) => (v <= 0 ? 0 : Math.max((v / max) * innerH, 2));
    const ticks = tickValues.map((value) => ({
      value,
      y: yOf(value),
    }));
    const bars = data.map((d, i) => {
      const onlineH = heightOf(d.online);
      const manualH = heightOf(d.manual);
      const x = PAD.left + i * slot + (slot - barW) / 2;
      return {
        x,
        center: PAD.left + i * slot + slot / 2,
        slotX: PAD.left + i * slot,
        onlineH,
        manualH,
        onlineY: baseline - onlineH,
        manualY: baseline - onlineH - manualH,
      };
    });
    return { innerH, slot, barW, baseline, ticks, bars };
  }, [data]);

  const nearestIndex = (clientX: number, target: SVGSVGElement) => {
    if (data.length === 0) return 0;
    const rect = target.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VIEW_W;
    let best = 0;
    let bestDist = Infinity;
    chart.bars.forEach((bar, i) => {
      const dist = Math.abs(bar.center - x);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    });
    return best;
  };

  const point = active != null ? data[active] : null;
  const tooltipLeft = active != null ? (chart.bars[active].center / VIEW_W) * 100 : 0;

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
        onFocus={() => setActive((prev) => prev ?? Math.max(data.length - 1, 0))}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (data.length === 0) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setActive((prev) => Math.min((prev ?? -1) + 1, data.length - 1));
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            setActive((prev) => Math.max((prev ?? data.length) - 1, 0));
          }
        }}
      >
        <title id={labelId}>{title}</title>
        <desc id={descId}>
          Stacked bar chart of online and manual collections by month. Bar height is
          the month total. Use left and right arrows to inspect each month.
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

        {data.map((d, i) => {
          const bar = chart.bars[i];
          const isActive = active === i;
          const dim = active != null && !isActive;
          const topIsManual = bar.manualH > 0;
          const topY = topIsManual ? bar.manualY : bar.onlineY;
          const topH = topIsManual ? bar.manualH : bar.onlineH;
          return (
            <g key={d.month}>
              <rect
                x={bar.slotX}
                y={PAD.top}
                width={chart.slot}
                height={chart.innerH}
                className={isActive ? "fill-foreground/5" : "fill-transparent"}
              />
              {bar.onlineH > 0 && !topIsManual ? (
                <path
                  d={roundedTopBar(bar.x, bar.onlineY, chart.barW, bar.onlineH, 4)}
                  className={dim ? "fill-foreground/35" : "fill-foreground"}
                />
              ) : bar.onlineH > 0 ? (
                <rect
                  x={bar.x}
                  y={bar.onlineY}
                  width={chart.barW}
                  height={bar.onlineH}
                  className={dim ? "fill-foreground/35" : "fill-foreground"}
                />
              ) : null}
              {topIsManual ? (
                <path
                  d={roundedTopBar(bar.x, topY, chart.barW, topH, 4)}
                  className={dim ? "fill-primary/40" : "fill-primary"}
                />
              ) : null}
              {data.length <= 12 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1 ? (
                <text
                  x={bar.center}
                  y={VIEW_H - 10}
                  textAnchor="middle"
                  className={isActive ? "fill-foreground text-[10px]" : "fill-muted-foreground text-[10px]"}
                >
                  {pointLabel(d)}
                </text>
              ) : null}
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
          <p className="font-medium mb-1.5">{pointLabel(point)}</p>
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
              <td>{pointLabel(d)}</td>
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

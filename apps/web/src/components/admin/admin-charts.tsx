"use client";

import { useId, useState } from "react";

export type ChartPoint = {
  label: string;
  value: number;
  hint?: string;
};

function shortWeek(iso: string) {
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function weekLabel(iso: string) {
  return shortWeek(iso);
}

function ticks(max: number): number[] {
  if (max <= 4) return [...Array(max + 1)].map((_, i) => i);
  const step = Math.ceil(max / 4);
  return [0, step, step * 2, step * 3, step * 4].filter((n) => n <= max * 1.05);
}

export function AreaChart({
  points,
  title,
  valueLabel,
}: {
  points: ChartPoint[];
  title: string;
  valueLabel: string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const values = points.map((point) => point.value);
  const max = Math.max(1, ...values);
  const width = 360;
  const height = 168;
  const padX = 12;
  const padTop = 16;
  const padBottom = 8;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? padX + innerW / 2
        : padX + (index / (points.length - 1)) * innerW;
    const y = padTop + innerH - (point.value / max) * innerH;
    return { x, y };
  });
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${padX},${height - padBottom} ${line} ${width - padX},${height - padBottom}`;
  const hover = active !== null ? points[active] : points[points.length - 1];
  const hoverCoord = active !== null ? coords[active] : coords[coords.length - 1];

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <figcaption className="font-display text-lg font-bold text-ink">{title}</figcaption>
          <p className="mt-0.5 text-xs text-ink-muted">Last 8 weeks · UTC weeks</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold tabular-nums text-ink">
            {(hover?.value ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold text-ink-muted">
            {hover?.label} · {valueLabel}
          </p>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-4 h-40 w-full"
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks(max).map((tick) => {
          const y = padTop + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-border"
                strokeWidth="1"
              />
            </g>
          );
        })}
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((coord, index) => (
          <g key={points[index]?.label ?? index}>
            <circle
              cx={coord.x}
              cy={coord.y}
              r={active === index ? 5 : 3.5}
              fill="var(--surface)"
              stroke="var(--brand)"
              strokeWidth="2"
            />
            <rect
              x={coord.x - innerW / points.length / 2}
              y={0}
              width={innerW / Math.max(1, points.length)}
              height={height}
              fill="transparent"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            />
          </g>
        ))}
        {hoverCoord ? (
          <line
            x1={hoverCoord.x}
            x2={hoverCoord.x}
            y1={padTop}
            y2={height - padBottom}
            stroke="var(--brand)"
            strokeOpacity="0.25"
            strokeDasharray="3 3"
          />
        ) : null}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </figure>
  );
}

export function BarChart({
  points,
  title,
  valueLabel,
  hint = "Weekly assistant quota sends",
}: {
  points: ChartPoint[];
  title: string;
  valueLabel: string;
  hint?: string;
}) {
  const [active, setActive] = useState<number | null>(points.length - 1);
  const values = points.map((point) => point.value);
  const max = Math.max(1, ...values);
  const hover = (active !== null ? points[active] : points[points.length - 1]) ?? points[0];

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <figcaption className="font-display text-lg font-bold text-ink">{title}</figcaption>
          <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold tabular-nums text-ink">
            {(hover?.value ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold text-ink-muted">
            {hover?.label} · {valueLabel}
          </p>
        </div>
      </div>
      <div className="mt-4 flex h-40 items-end gap-1.5" role="img" aria-label={title}>
        {points.map((point, index) => {
          const height = Math.max(6, Math.round((point.value / max) * 100));
          const selected = active === index;
          return (
            <button
              key={point.label}
              type="button"
              title={point.hint ?? `${point.value} ${valueLabel}`}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span
                className={[
                  "w-full max-w-9 rounded-t-lg transition",
                  selected ? "bg-brand" : "bg-brand-soft group-hover:bg-brand-light",
                ].join(" ")}
                style={{ height: `${height}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </figure>
  );
}

export function Sparkline({ values, className = "h-8 w-24" }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values);
  const width = 96;
  const height = 32;
  const coords = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 2 - (value / max) * (height - 4);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProgressRing({
  value,
  total,
  className = "h-14 w-14",
}: {
  value: number;
  total: number;
  className?: string;
}) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <svg viewBox="0 0 56 56" className={`-rotate-90 ${className}`} aria-hidden>
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-brand-soft"
        strokeWidth="6"
      />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
      />
    </svg>
  );
}

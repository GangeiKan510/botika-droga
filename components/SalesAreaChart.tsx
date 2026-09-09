import {
  formatCompactMoney,
  salesChartLabelIndexes,
  type SalesChartPoint,
  type SalesPeriod,
} from "@/lib/inventory";

export function SalesAreaChart({
  series,
  period,
}: {
  series: SalesChartPoint[];
  period: SalesPeriod;
}) {
  const width = 640;
  const height = 260;
  const pad = { top: 16, right: 12, bottom: 36, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = Math.max(...series.map((p) => p.total), 0);
  const chartMax = niceCeiling(max);
  const ticks = buildTicks(chartMax);
  const showPoints = series.length <= 60;

  const points = series.map((point, i) => {
    const x =
      pad.left +
      (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const y =
      pad.top +
      innerH -
      (chartMax === 0 ? 0 : (point.total / chartMax) * innerH);
    return { ...point, x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length === 0
      ? ""
      : [
          `M ${points[0]!.x.toFixed(1)} ${(pad.top + innerH).toFixed(1)}`,
          ...points.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
          `L ${points[points.length - 1]!.x.toFixed(1)} ${(pad.top + innerH).toFixed(1)}`,
          "Z",
        ].join(" ");

  const labelIndexes = salesChartLabelIndexes(series, period);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${period} sales area chart`}
      >
        <defs>
          <linearGradient id="salesAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const y = pad.top + innerH - (tick / chartMax) * innerH;
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="#ccfbf1"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-teal-800/55"
                fontSize="11"
              >
                {formatCompactMoney(tick)}
              </text>
            </g>
          );
        })}

        {areaPath ? <path d={areaPath} fill="url(#salesAreaFill)" /> : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="#0f766e"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {showPoints
          ? points.map((p) => (
              <circle
                key={p.key}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#fff"
                stroke="#0f766e"
                strokeWidth="2"
              >
                <title>{`${p.label}: ${formatCompactMoney(p.total)}`}</title>
              </circle>
            ))
          : null}

        {points.map((p, i) =>
          labelIndexes.has(i) ? (
            <text
              key={`label-${p.key}`}
              x={p.x}
              y={height - 12}
              textAnchor="middle"
              className="fill-teal-800/65"
              fontSize="11"
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
      {max === 0 ? (
        <p className="mt-2 text-center text-sm text-teal-800/60">
          No dispensed sales for this year yet.
        </p>
      ) : null}
    </div>
  );
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function buildTicks(max: number): number[] {
  const steps = 5;
  const ticks: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    ticks.push((max / steps) * i);
  }
  return ticks;
}

// Lightweight, dependency-free SVG charts in the app's monochrome palette.
// Single-series by design (the panel title names the series, so no legend).
import { useRef, useState } from "react";

// Area + line chart with a hover crosshair and a dark tooltip.
// data: [{ label, value }] oldest → newest.
export function AreaChart({ data = [], valueLabel = "value", height = 260 }) {
  const W = 640;
  const H = height;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const ref = useRef(null);
  const [hover, setHover] = useState(null);

  if (!data.length) return <p className="dash-muted">No applications yet.</p>;

  const n = data.length;
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const x = (i) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => padT + innerH - (v / maxV) * innerH;

  const linePoints = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const areaPath =
    `M ${x(0)},${padT + innerH} ` +
    `L ${data.map((d, i) => `${x(i)},${y(d.value)}`).join(" L ")} ` +
    `L ${x(n - 1)},${padT + innerH} Z`;

  const TICKS = 4;
  const gridVals = Array.from({ length: TICKS + 1 }, (_, i) => Math.round((maxV / TICKS) * i));

  function handleMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let idx = Math.round(((px - padL) / innerW) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    setHover(idx);
  }

  // Tooltip geometry (clamped inside the plot).
  const tipW = 104;
  const tipH = 44;
  let tipX = 0;
  let tipY = 0;
  if (hover != null) {
    tipX = Math.min(Math.max(x(hover) - tipW / 2, padL), W - padR - tipW);
    tipY = Math.max(y(data[hover].value) - tipH - 12, padT);
  }

  const summary = `${valueLabel} over ${n} weeks, from ${data[0].value} to ${data[n - 1].value}.`;

  return (
    <svg
      ref={ref}
      className="chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={summary}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-text)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--color-text)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Recessive horizontal gridlines + y labels */}
      {gridVals.map((gv, i) => {
        const gy = y(gv);
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={gy} y2={gy} className="chart-grid" />
            <text x={padL - 8} y={gy + 3.5} className="chart-axis chart-axis--y">{gv}</text>
          </g>
        );
      })}

      {/* Area + line */}
      <path d={areaPath} fill="url(#areaFill)" />
      <polyline points={linePoints} className="chart-line" />

      {/* x labels (every other to avoid crowding) */}
      {data.map((d, i) =>
        i % 2 === 0 || i === n - 1 ? (
          <text key={i} x={x(i)} y={H - 10} className="chart-axis chart-axis--x">{d.label}</text>
        ) : null
      )}

      {/* Hover layer */}
      {hover != null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} className="chart-crosshair" />
          <circle cx={x(hover)} cy={y(data[hover].value)} r="4.5" className="chart-marker" />
          <g transform={`translate(${tipX},${tipY})`}>
            <rect width={tipW} height={tipH} rx="8" className="chart-tip" />
            <text x="12" y="19" className="chart-tip__value">{data[hover].value}</text>
            <text x="12" y="34" className="chart-tip__label">{data[hover].label}</text>
          </g>
        </g>
      )}
    </svg>
  );
}

// A tiny inline bar showing a value's share of a max — used on listing cards
// in place of the template's per-item sparkline (we don't have per-job series).
export function ShareBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="sharebar" aria-hidden="true">
      <div className="sharebar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

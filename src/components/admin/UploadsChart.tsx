'use client';

import { useId, useMemo, useState } from 'react';

export interface UploadMonth {
  label: string;
  uploads: number;
}

const W = 720;
const H = 264;
const PAD = { left: 38, right: 16, top: 20, bottom: 30 };

/** Catmull-Rom → cubic Bézier smoothing for a gentle wave line. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * "Statistics" area chart: materials added per month, drawn as an
 * animated burgundy wave over a soft gradient wash. Hovering a month
 * pins a guide line and a tooltip — no chart library involved.
 */
export function UploadsChart({ data }: { data: UploadMonth[] }) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const rawMax = Math.max(...data.map((d) => d.uploads), 0);
  const niceMax = Math.max(4, Math.ceil(rawMax / 5) * 5);
  const allZero = rawMax === 0;

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        x: PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
        y: PAD.top + innerH - (d.uploads / niceMax) * innerH,
      })),
    [data, innerW, innerH, niceMax]
  );

  const line = smoothPath(points);
  const baseY = PAD.top + innerH;
  const area = line ? `${line} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z` : '';
  const ticks = [0, 1, 2, 3].map((i) => Math.round((niceMax / 3) * i));
  const shown = active ?? data.length - 1;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Uploads per month: ${data.map((d) => `${d.label} ${d.uploads}`).join(', ')}`}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#790000" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#790000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid + y labels */}
        {ticks.map((t) => {
          const y = PAD.top + innerH - (t / niceMax) * innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#F1E4E5" strokeWidth="1" />
              <text x={PAD.left - 9} y={y + 4} textAnchor="end" fontSize="11" fill="#B09CA0">
                {t}
              </text>
            </g>
          );
        })}

        {/* Month labels */}
        {data.map((d, i) => (
          <text
            key={d.label + i}
            x={points[i].x}
            y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill={i === shown ? '#790000' : '#B09CA0'}
            fontWeight={i === shown ? 700 : 500}
          >
            {d.label}
          </text>
        ))}

        {/* Area + wave */}
        {area ? <path d={area} fill={`url(#${gradientId})`} className="anim-fade" /> : null}
        {line ? (
          <path
            d={line}
            fill="none"
            stroke="#790000"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={1}
            className="anim-draw"
          />
        ) : null}

        {/* Active guide + point */}
        {!allZero && points[shown] ? (
          <g className="transition-opacity duration-150">
            <line
              x1={points[shown].x}
              x2={points[shown].x}
              y1={PAD.top}
              y2={baseY}
              stroke="#790000"
              strokeOpacity="0.25"
              strokeDasharray="3 4"
            />
            <circle cx={points[shown].x} cy={points[shown].y} r="9" fill="#790000" opacity="0.14" />
            <circle
              cx={points[shown].x}
              cy={points[shown].y}
              r="4.5"
              fill="#fff"
              stroke="#790000"
              strokeWidth="2.5"
            />
          </g>
        ) : null}

        {/* Hover zones */}
        {data.map((d, i) => (
          <rect
            key={`zone-${d.label}`}
            x={PAD.left + (i / data.length) * innerW}
            y={PAD.top}
            width={innerW / data.length}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
          />
        ))}
      </svg>

      {/* Tooltip bubble */}
      {!allZero && points[shown] ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-xl bg-charcoal px-3 py-1.5 text-center shadow-lg transition-all duration-150"
          style={{
            left: `${(points[shown].x / W) * 100}%`,
            top: 0,
          }}
        >
          <span className="block text-[13px] font-bold leading-none text-white">
            {data[shown].uploads}
          </span>
          <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-wider text-white/60">
            {data[shown].label} uploads
          </span>
        </div>
      ) : null}

      {allZero ? (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-muted">
          Uploads will chart here as study materials are added.
        </p>
      ) : null}
    </div>
  );
}

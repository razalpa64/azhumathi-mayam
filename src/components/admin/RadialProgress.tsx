import type { ReactNode } from 'react';

/**
 * SVG progress ring (donut), server-renderable: the stroke sweeps to
 * its value on mount via the .anim-ring keyframes. Center content is
 * absolutely positioned children (big % / number).
 */
export function RadialProgress({
  percent,
  size = 148,
  stroke = 13,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3E3E4"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#790000"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="anim-ring"
          style={
            {
              '--ring-from': circumference,
              '--ring-to': target,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

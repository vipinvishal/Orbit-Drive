"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatBytes } from "@/lib/format";

type OrbitRingProps = {
  used: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  centerValue?: string;
  delay?: number;
};

// >85% used escalates to warning, >95% to critical — status colors are
// reserved for state, never reused as a plain series color, so this only
// ever overrides a ring's own fill, never assigns identity to a peer.
function ringColor(pct: number, base: string): string {
  if (pct >= 0.95) return "var(--critical)";
  if (pct >= 0.85) return "var(--warning)";
  return base;
}

export default function OrbitRing({
  used,
  total,
  size = 180,
  strokeWidth = 14,
  color = "var(--gold)",
  label,
  centerValue,
  delay = 0,
}: OrbitRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const pct = total > 0 ? Math.min(used / total, 1) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillColor = ringColor(pct, color);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--chart-track)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.1, ease: [0.16, 1, 0.3, 1], delay }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 4,
        }}
      >
        <span style={{ fontSize: size * 0.15, fontWeight: 700, lineHeight: 1.1, fontFamily: "var(--font-body)" }}>
          {centerValue ?? `${Math.round(pct * 100)}%`}
        </span>
        {label && (
          <span className="muted" style={{ fontSize: size * 0.065, marginTop: 4 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export function ringSubtext(used: number, total: number): string {
  return `${formatBytes(used)} / ${formatBytes(total)}`;
}

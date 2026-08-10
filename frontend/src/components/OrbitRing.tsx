"use client";

import { useId } from "react";
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
  const isDefaultGold = color === "var(--gold)";
  const uid = useId();
  const gradientId = `orbit-ring-gradient-${uid}`;
  const glowId = `orbit-ring-glow-${uid}`;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {isDefaultGold && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-14%",
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--gold-wash), transparent 70%)",
            filter: "blur(6px)",
            pointerEvents: "none",
          }}
        />
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "relative", transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={strokeWidth * 0.35} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--chart-track)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDefaultGold && pct < 0.85 ? `url(#${gradientId})` : fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          filter={isDefaultGold ? `url(#${glowId})` : undefined}
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

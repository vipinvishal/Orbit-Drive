"use client";

import { motion, useReducedMotion } from "motion/react";

// A literal orbit: the pooled drive is the sun, each connected storage
// account is a planet actually traveling its own elliptical track around
// it — not a static network diagram. Node shapes are deliberately distinct
// (cloud / block / tiered / database) since the pool isn't one platform.
// Single 400x400 SVG coordinate space throughout, so nothing can drift.
const SIZE = 400;
const CENTER = SIZE / 2;
const RING_RADIUS = 70;
const RING_STROKE = 14;

type NodeShape = "cloud" | "box" | "layers" | "disc";

function ellipsePath(rx: number, ry: number) {
  return `M${CENTER + rx},${CENTER} A${rx} ${ry} 0 1 1 ${CENTER - rx},${CENTER} A${rx} ${ry} 0 1 1 ${CENTER + rx},${CENTER}`;
}

const ORBITS = [
  { rx: 138, ry: 54, duration: 24 },
  { rx: 178, ry: 76, duration: 32 },
] as const;

const NODES: { orbit: 0 | 1; color: string; shape: NodeShape; phase: number }[] = [
  { orbit: 0, color: "var(--chart-1)", shape: "cloud", phase: 0 },
  { orbit: 0, color: "var(--chart-3)", shape: "layers", phase: 0.5 },
  { orbit: 1, color: "var(--chart-5)", shape: "box", phase: 0.15 },
  { orbit: 1, color: "var(--chart-4)", shape: "disc", phase: 0.65 },
];

const NODE_RADIUS = 22;
const ICON_BOX = 18;

function NodeIcon({ shape }: { shape: NodeShape }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (shape) {
    case "cloud":
      return <path {...stroke} d="M7 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 16.9 8H17.5a4.5 4.5 0 0 1 .5 8.97" />;
    case "box":
      return (
        <>
          <path {...stroke} d="M12 2 21 7 21 17 12 22 3 17 3 7 12 2Z" />
          <path {...stroke} d="M3 7 12 12 21 7" />
          <path {...stroke} d="M12 12v10" />
        </>
      );
    case "layers":
      return (
        <>
          <path {...stroke} d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path {...stroke} d="m3 13 9 5 9-5" />
        </>
      );
    case "disc":
      return (
        <>
          <ellipse {...stroke} cx={12} cy={5} rx={8} ry={3} />
          <path {...stroke} d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
          <path {...stroke} d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </>
      );
  }
}

const STARS = [
  { x: 30, y: 60, r: 1.4, d: 4 },
  { x: 370, y: 40, r: 1.1, d: 5 },
  { x: 20, y: 200, r: 1.3, d: 3.5 },
  { x: 385, y: 230, r: 1.6, d: 4.5 },
  { x: 55, y: 350, r: 1.2, d: 5.5 },
  { x: 340, y: 370, r: 1.4, d: 4 },
  { x: 200, y: 20, r: 1.1, d: 3 },
  { x: 200, y: 385, r: 1.3, d: 4.8 },
];

export default function StoragePoolVisual({ size = 380 }: { size?: number }) {
  const prefersReducedMotion = useReducedMotion();
  const circumference = 2 * Math.PI * RING_RADIUS;
  const fillFraction = 0.6;

  return (
    <div style={{ width: "100%", maxWidth: size, aspectRatio: "1 / 1" }} aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>

        {/* ambient depth: soft color wash + faint star dust, matches the app background */}
        <circle cx={CENTER} cy={CENTER} r={195} fill="url(#coreGlow)" />
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff">
            <animate attributeName="opacity" values="0.15;0.75;0.15" dur={`${s.d}s`} repeatCount="indefinite" begin={`${i * 0.4}s`} />
          </circle>
        ))}

        {ORBITS.map((orbit, i) => (
          <ellipse
            key={i}
            cx={CENTER}
            cy={CENTER}
            rx={orbit.rx}
            ry={orbit.ry}
            fill="none"
            stroke="var(--border-bright)"
            strokeWidth={1}
            strokeDasharray="1 7"
            opacity={0.55}
          />
        ))}

        {NODES.map((node, i) => {
          const orbit = ORBITS[node.orbit];
          const path = ellipsePath(orbit.rx, orbit.ry);
          const begin = -(node.phase * orbit.duration);
          return (
            <g key={i}>
              {[0.55, 0.35].map((frac, t) => (
                <circle key={t} r={NODE_RADIUS * 0.22 * (1 - t * 0.3)} fill={node.color} opacity={0.16 - t * 0.06}>
                  <animateMotion
                    dur={`${orbit.duration}s`}
                    repeatCount="indefinite"
                    begin={`${begin - frac * 0.9}s`}
                    path={path}
                  />
                </circle>
              ))}
            </g>
          );
        })}

        <circle cx={CENTER} cy={CENTER} r={RING_RADIUS + RING_STROKE / 2 + 6} fill="none" stroke="var(--gold)" strokeWidth={2} opacity={0.12} />
        <circle cx={CENTER} cy={CENTER} r={RING_RADIUS} fill="var(--void)" stroke="var(--chart-track)" strokeWidth={RING_STROKE} />
        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - fillFraction) }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
        <text x={CENTER} y={CENTER - 4} textAnchor="middle" fill="var(--text)" fontFamily="var(--font-body)" fontWeight={700} fontSize={26}>
          1 Drive
        </text>
        <text x={CENTER} y={CENTER + 18} textAnchor="middle" fill="var(--text-dim)" fontFamily="var(--font-body)" fontSize={11}>
          everything, pooled
        </text>

        {NODES.map((node, i) => {
          const orbit = ORBITS[node.orbit];
          const path = ellipsePath(orbit.rx, orbit.ry);
          const begin = -(node.phase * orbit.duration);
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.12 }}
            >
              <g>
                <animateMotion dur={`${orbit.duration}s`} repeatCount="indefinite" begin={`${begin}s`} path={path} />
                <circle r={NODE_RADIUS} fill={node.color} fillOpacity={0.16} stroke={node.color} strokeWidth={1.6} />
                <g transform={`translate(${-ICON_BOX / 2}, ${-ICON_BOX / 2}) scale(${ICON_BOX / 24})`} color={node.color}>
                  <NodeIcon shape={node.shape} />
                </g>
              </g>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

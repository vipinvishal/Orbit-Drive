"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatBytes } from "@/lib/format";
import { ImageFileIcon, VideoFileIcon, DocFileIcon, FileIcon } from "@/components/icons";
import type { StorageBreakdown } from "@/lib/types";

const SIZE = 168;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CATEGORIES: { key: keyof StorageBreakdown; label: string; color: string; icon: typeof ImageFileIcon }[] = [
  { key: "images_bytes", label: "Photos", color: "var(--chart-1)", icon: ImageFileIcon },
  { key: "videos_bytes", label: "Videos", color: "var(--chart-5)", icon: VideoFileIcon },
  { key: "documents_bytes", label: "Documents", color: "var(--chart-3)", icon: DocFileIcon },
  { key: "other_bytes", label: "Other", color: "var(--chart-4)", icon: FileIcon },
];

export default function CategoryBreakdown({ breakdown }: { breakdown: StorageBreakdown | null }) {
  const prefersReducedMotion = useReducedMotion();

  if (!breakdown) {
    return (
      <div className="card row" style={{ height: 200, alignItems: "center", justifyContent: "center", color: "var(--text-faint)" }}>
        <span className="spinner" /> Reading file types…
      </div>
    );
  }

  const total = breakdown.images_bytes + breakdown.videos_bytes + breakdown.documents_bytes + breakdown.other_bytes;

  if (total === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-dim)" }}>
        No files yet — upload something and this fills in.
      </div>
    );
  }

  const segments = CATEGORIES.reduce<{ key: string; color: string; segmentLength: number; offset: number }[]>((acc, cat) => {
    const fraction = breakdown[cat.key] / total;
    if (fraction <= 0) return acc;
    const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].segmentLength : 0;
    acc.push({ key: cat.key, color: cat.color, segmentLength: fraction * CIRCUMFERENCE, offset: prevOffset });
    return acc;
  }, []);

  return (
    <div className="card row" style={{ gap: 32, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0, margin: "0 auto" }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--chart-track)" strokeWidth={STROKE} />
          {segments.map(({ key, color, segmentLength, offset }, i) => {
            return (
              <motion.circle
                key={key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={color}
                strokeWidth={STROKE}
                strokeDasharray={`${segmentLength} ${CIRCUMFERENCE - segmentLength}`}
                initial={{ strokeDashoffset: -offset, opacity: 0 }}
                animate={{ strokeDashoffset: -offset, opacity: 1 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.7, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }
                }
              />
            );
          })}
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
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700 }}>{formatBytes(total)}</span>
          <span className="muted" style={{ fontSize: 11, marginTop: 2 }}>
            total stored
          </span>
        </div>
      </div>

      <div className="stack" style={{ gap: 12, flex: "1 1 220px", minWidth: 200 }}>
        {CATEGORIES.map((cat, i) => {
          const value = breakdown[cat.key];
          const pct = total > 0 ? (value / total) * 100 : 0;
          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="between" style={{ fontSize: 13 }}>
                <span className="row" style={{ gap: 8, color: "var(--text)" }}>
                  <span style={{ color: cat.color, display: "flex" }}>
                    <cat.icon size={15} />
                  </span>
                  {cat.label}
                </span>
                <span className="mono muted" style={{ fontSize: 12 }}>
                  {formatBytes(value)}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 4, background: "var(--void-3)", marginTop: 6, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: "100%", background: cat.color }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

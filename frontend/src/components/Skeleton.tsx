// Shimmering placeholders shaped like the content they stand in for, not a
// generic spinner + "Loading…" — loading states get as much design
// attention as the real data view, since it's the first thing every visit
// actually shows.

export function SkeletonLine({ width = "100%", height = 13 }: { width?: number | string; height?: number }) {
  return <span className="skeleton" style={{ display: "block", width, height, borderRadius: 4 }} />;
}

export function SkeletonCircle({ size = 34 }: { size?: number }) {
  return <span className="skeleton" style={{ display: "block", width: size, height: size, borderRadius: "50%", flexShrink: 0 }} />;
}

export function SkeletonBlock({ width = "100%", height = 20, radius }: { width?: number | string; height?: number; radius?: number }) {
  return <span className="skeleton" style={{ display: "block", width, height, borderRadius: radius ?? "var(--radius-sm)" }} />;
}

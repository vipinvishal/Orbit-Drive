"use client";

// A much quieter cousin of the landing page's atmosphere — this is a tool
// people sit in for minutes at a time managing real files, so it stays as
// a single faint, slow-drifting wash instead of the marketing page's full
// nebula + orbit-ring treatment. Scoped per-page (dashboard, accounts),
// not global, so it never fights with modal overlays or dense file lists.
export default function AppBackground() {
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: -1, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: "-18%",
          right: "-12%",
          width: "42vw",
          height: "42vw",
          maxWidth: 520,
          maxHeight: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--gold-wash), transparent 70%)",
          filter: "blur(10px)",
          opacity: 0.6,
          animation: "drift 34s ease-in-out infinite",
        }}
      />
    </div>
  );
}

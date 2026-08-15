"use client";

// A quieter cousin of the landing page's atmosphere — this is a tool people
// sit in for minutes at a time managing real files, so the wash stays calm
// and never fights with modal overlays or dense file lists. It still needs
// to read as *something* on wide monitors, where the content column leaves
// real space either side of it — a single faint blob disappeared entirely
// at that scale, so this carries two more cues (a cool blob, a huge faint
// orbit ring) echoing the landing page's motif instead of leaving that
// space flat black. Scoped per-page (dashboard, accounts, profile).
export default function AppBackground() {
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: -1, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: "-18%",
          right: "-10%",
          width: "46vw",
          height: "46vw",
          maxWidth: 620,
          maxHeight: 620,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--gold-wash), transparent 70%)",
          filter: "blur(10px)",
          animation: "drift 34s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-16%",
          left: "-10%",
          width: "38vw",
          height: "38vw",
          maxWidth: 500,
          maxHeight: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(57,135,229,0.08), transparent 70%)",
          filter: "blur(10px)",
          animation: "drift 40s ease-in-out infinite reverse",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "8%",
          right: "-16%",
          width: 720,
          height: 720,
          borderRadius: "50%",
          border: "1px solid var(--border)",
          opacity: 0.4,
        }}
      />
    </div>
  );
}

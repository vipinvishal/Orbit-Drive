"use client";

// Layered atmosphere behind the landing page only — the app-wide .starfield
// (in globals.css, used on every page) stays untouched. This adds slow
// drifting nebula blobs and a couple of huge faint orbit rings so the page
// doesn't read as a flat void behind the content, without being loud enough
// to fight the copy.
export default function LandingBackground() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "-8%",
          width: "55vw",
          height: "55vw",
          maxWidth: 640,
          maxHeight: 640,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--gold-wash), transparent 70%)",
          filter: "blur(10px)",
          animation: "drift 22s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "18%",
          right: "-12%",
          width: "45vw",
          height: "45vw",
          maxWidth: 520,
          maxHeight: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(57,135,229,0.1), transparent 70%)",
          filter: "blur(10px)",
          animation: "drift 26s ease-in-out infinite reverse",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-6%",
          left: "20%",
          width: "38vw",
          height: "38vw",
          maxWidth: 460,
          maxHeight: 460,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(153,133,233,0.07), transparent 70%)",
          filter: "blur(10px)",
          animation: "drift 30s ease-in-out infinite",
        }}
      />

      {[420, 640].map((d, i) => (
        <div
          key={d}
          style={{
            position: "absolute",
            top: "6%",
            right: `${-8 - i * 6}%`,
            width: d,
            height: d,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}

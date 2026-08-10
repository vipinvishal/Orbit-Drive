"use client";

import { motion, useReducedMotion } from "motion/react";
import { API_BASE_URL } from "@/lib/api";
import { GoogleMark } from "@/components/icons";
import StoragePoolVisual from "./StoragePoolVisual";

const STATS = [
  { value: "15GB", label: "free, per account — pooled, not wasted" },
  { value: "0", label: "duplicate files, ever" },
  { value: "256-bit", label: "encrypted tokens, always" },
];

// A percentage-based translateY mask (e.g. y: "115%") measures against the
// element's own box — if the text wraps to 2 lines on a narrow viewport,
// that box is taller than expected and the slide-up reveal visibly shears
// mid-word. A fixed pixel offset has no dependency on how many lines the
// text wraps to, so it can't glitch regardless of viewport width.
function RevealLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.span
      style={{ display: "block" }}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.span>
  );
}

export default function Hero() {
  const reduceMotion = useReducedMotion();

  function handleContinue() {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  }

  return (
    <section
      style={{
        position: "relative",
        maxWidth: 1180,
        margin: "0 auto",
        padding: "clamp(48px, 8vw, 96px) 24px 64px",
        display: "flex",
        alignItems: "center",
        gap: 48,
        flexWrap: "wrap-reverse",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ flex: "1 1 420px", minWidth: 300 }}
      >
        <motion.span
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="row mono"
          style={{
            display: "inline-flex",
            color: "var(--gold)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            border: "1px solid var(--gold-ring)",
            background: "var(--gold-wash)",
            borderRadius: 20,
            padding: "5px 12px 5px 10px",
            gap: 7,
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", flexShrink: 0 }}
          />
          Storage virtualization, live
        </motion.span>

        <h1 style={{ fontSize: "clamp(30px, 7vw, 64px)", lineHeight: 1.1, marginTop: 22 }}>
          <RevealLine delay={0.15}>Every Google Drive</RevealLine>
          <RevealLine delay={0.26}>
            you own.{" "}
            <span
              style={{
                backgroundImage: "linear-gradient(120deg, var(--gold-bright), var(--gold))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              One orbit.
            </span>
          </RevealLine>
        </h1>

        <p style={{ marginTop: 22, maxWidth: 480, fontSize: "clamp(18px, 2.7vw, 23px)", fontWeight: 700, lineHeight: 1.42 }}>
          <motion.span
            initial={{ opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: [8, -3, 2, -1, 0] }}
            transition={{ duration: reduceMotion ? 0.4 : 0.55, delay: 0.34, ease: "easeOut" }}
            style={{ color: "var(--text-dim)", display: "inline-block" }}
          >
            We could vanish tomorrow.{" "}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ color: "var(--gold)", display: "inline-block" }}
          >
            Your files wouldn&rsquo;t even notice.
          </motion.span>
        </p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="muted"
          style={{ fontSize: 17, lineHeight: 1.65, marginTop: 18, maxWidth: 480 }}
        >
          You&rsquo;ve got free storage scattered across every Gmail account you&rsquo;ve ever made. Orbit Drive
          pools all of them — two, five, however many — into a single, self-organizing drive that finally acts
          like the space you already own.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.04 }}
          className="row"
          style={{ marginTop: 28, flexWrap: "wrap", gap: 14 }}
        >
          <div style={{ position: "relative", display: "inline-flex" }}>
            <motion.span
              aria-hidden="true"
              animate={{ opacity: [0.55, 0, 0.55], scale: [1, 1.35, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "var(--radius-sm)",
                background: "var(--gold)",
                filter: "blur(14px)",
                zIndex: 0,
              }}
            />
            <motion.button
              whileHover={{ y: -1, boxShadow: "0 8px 22px rgba(0,0,0,0.35)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinue}
              className="row"
              style={{
                position: "relative",
                zIndex: 1,
                gap: 10,
                background: "#fff",
                color: "#1f1f1f",
                padding: "13px 22px",
                fontSize: 15,
              }}
            >
              <GoogleMark size={18} />
              Continue with Google — it&rsquo;s free
            </motion.button>
          </div>
          <motion.a
            href="#how-it-works"
            whileHover={{ y: -1 }}
            className="row secondary"
            style={{
              gap: 8,
              padding: "13px 20px",
              fontSize: 15,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            See how it works
          </motion.a>
        </motion.div>

        <div className="row" style={{ marginTop: 36, gap: 28, flexWrap: "wrap" }}>
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.18 + i * 0.1 }}
            >
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--gold)" }}>
                {stat.value}
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2, maxWidth: 140, lineHeight: 1.4 }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ flex: "1 1 320px", display: "flex", justifyContent: "center", minWidth: 280 }}
      >
        <StoragePoolVisual size={380} />
      </motion.div>

      <motion.a
        href="#how-it-works"
        aria-label="Scroll to learn how it works"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        style={{
          position: "absolute",
          bottom: -8,
          left: "50%",
          transform: "translateX(-50%)",
          color: "var(--text-faint)",
          display: "flex",
        }}
      >
        <motion.svg
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </motion.svg>
      </motion.a>
    </section>
  );
}

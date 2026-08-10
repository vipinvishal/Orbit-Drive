"use client";

import { motion, useReducedMotion } from "motion/react";
import { API_BASE_URL } from "@/lib/api";
import { GoogleMark } from "@/components/icons";
import StoragePoolVisual from "./StoragePoolVisual";

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
        <h1 style={{ fontSize: "clamp(30px, 7vw, 64px)", lineHeight: 1.15 }}>
          <RevealLine delay={0.12}>
            Turns out, you&rsquo;re <span style={{ color: "var(--gold)" }}>not out of storage.</span>
          </RevealLine>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32 }}
          style={{
            marginTop: 20,
            maxWidth: 480,
            fontSize: "clamp(17px, 2.3vw, 20px)",
            fontWeight: 700,
            lineHeight: 1.5,
            color: "var(--text)",
          }}
        >
          You&rsquo;ve got 15GB free on every Gmail account you&rsquo;ve ever made — two, five, however many.
          Orbit Drive pools all of them into one.
        </motion.p>

        <p style={{ marginTop: 20, maxWidth: 480, fontSize: "clamp(15.5px, 2vw, 17px)", lineHeight: 1.55 }}>
          <motion.span
            initial={{ opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: [8, -3, 2, -1, 0] }}
            transition={{ duration: reduceMotion ? 0.4 : 0.55, delay: 0.52, ease: "easeOut" }}
            style={{ color: "var(--text-dim)", display: "inline-block" }}
          >
            We could vanish tomorrow.
          </motion.span>{" "}
          <motion.span
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.78, ease: [0.16, 1, 0.3, 1] }}
            style={{ color: "var(--gold)", display: "inline-block", fontWeight: 700 }}
          >
            Your files wouldn&rsquo;t even notice.
          </motion.span>
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.02 }}
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

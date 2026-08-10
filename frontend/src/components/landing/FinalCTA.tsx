"use client";

import { motion } from "motion/react";
import { API_BASE_URL } from "@/lib/api";
import { GoogleMark } from "@/components/icons";

export default function FinalCTA() {
  function handleContinue() {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  }

  return (
    <section style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          textAlign: "center",
          padding: "clamp(48px, 8vw, 88px) 24px",
          borderRadius: 24,
          border: "1px solid var(--border)",
          overflow: "hidden",
          background: "var(--void-1)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 560px 340px at 50% 0%, var(--gold-wash), transparent 65%)",
            pointerEvents: "none",
          }}
        />
        {[260, 380, 500].map((d, i) => (
          <motion.div
            key={d}
            aria-hidden="true"
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 40 + i * 16, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: d,
              height: d,
              marginLeft: -d / 2,
              marginTop: -d / 2,
              borderRadius: "50%",
              border: "1px solid var(--border)",
              opacity: 0.35 - i * 0.08,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--gold)",
                top: -2.5,
                left: "50%",
                marginLeft: -2.5,
                boxShadow: "0 0 8px var(--gold)",
              }}
            />
          </motion.div>
        ))}

        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: "clamp(28px, 4.4vw, 42px)", lineHeight: 1.2 }}>
            You don&rsquo;t need more storage.
            <br />
            You need it in one place.
          </h2>
          <p className="muted" style={{ marginTop: 14, fontSize: 15.5, maxWidth: 460, margin: "14px auto 0" }}>
            One Google sign-in pools everything you&rsquo;ve already got — free, and every other account ready
            to add right after.
          </p>
          <div style={{ position: "relative", display: "inline-flex", marginTop: 28 }}>
            <motion.span
              aria-hidden="true"
              animate={{ opacity: [0.55, 0, 0.55], scale: [1, 1.35, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "var(--radius-sm)",
                background: "var(--gold)",
                filter: "blur(16px)",
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
                padding: "13px 24px",
                fontSize: 15,
              }}
            >
              <GoogleMark size={18} />
              Continue with Google
            </motion.button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

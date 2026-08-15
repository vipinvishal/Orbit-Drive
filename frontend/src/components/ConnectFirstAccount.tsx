"use client";

import { motion } from "motion/react";
import { API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { GoogleMark } from "@/components/icons";

// Shown instead of the normal file-browser chrome (storage ring, search,
// dropzone) when a user has zero connected accounts — that chrome all
// reads as broken/empty with nothing pooled yet ("0 B / 0 B across 0
// accounts", a dropzone with nowhere to place an upload). This gives the
// one actionable next step instead.
export default function ConnectFirstAccount() {
  function handleConnect() {
    const token = getToken();
    if (!token) return;
    window.location.href = `${API_BASE_URL}/accounts/google/connect?access_token=${encodeURIComponent(token)}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="card"
      style={{
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
        padding: "clamp(48px, 8vw, 76px) 24px",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--gold-wash), transparent 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          display: "inline-flex",
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "var(--gold-wash)",
          border: "1px solid var(--gold-ring)",
          color: "var(--gold)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <GoogleMark size={30} />
      </motion.span>

      <h2 style={{ position: "relative", fontSize: 22, fontWeight: 700 }}>Connect your first Google account</h2>
      <p className="muted" style={{ position: "relative", fontSize: 14.5, maxWidth: 380, margin: "10px auto 0", lineHeight: 1.6 }}>
        Orbit Drive pools your Google Drive storage into one place. Connect an account to get started — it only
        takes a few seconds.
      </p>

      <div style={{ position: "relative", marginTop: 26, display: "inline-flex" }}>
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
          onClick={handleConnect}
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
    </motion.div>
  );
}

"use client";

import { motion } from "motion/react";
import { API_BASE_URL } from "@/lib/api";
import { GoogleMark } from "@/components/icons";

export default function LoginPage() {
  function handleContinue() {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  }

  return (
    <div
      className="page"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "72vh" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: "center", maxWidth: 420 }}
      >
        <OrbitGraphic />

        <h1 style={{ fontSize: 30, marginTop: 28 }}>One drive. Every Google account.</h1>
        <p className="muted" style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6 }}>
          Continue with Google to sign in — the account you use becomes your first pooled drive automatically. Add
          more anytime.
        </p>

        <motion.button
          whileHover={{ y: -1, boxShadow: "0 8px 22px rgba(0,0,0,0.35)" }}
          whileTap={{ scale: 0.98 }}
          onClick={handleContinue}
          className="row"
          style={{
            marginTop: 28,
            width: "100%",
            justifyContent: "center",
            gap: 10,
            background: "#fff",
            color: "#1f1f1f",
            padding: "13px 20px",
            fontSize: 15,
          }}
        >
          <GoogleMark size={18} />
          Continue with Google
        </motion.button>

        <p className="muted" style={{ marginTop: 20, fontSize: 12.5 }}>
          By continuing you agree to let Orbit Drive create and manage files it uploads on your behalf, via
          Google&rsquo;s limited <span className="mono">drive.file</span> scope. We never see your existing Drive
          contents.
        </p>
      </motion.div>
    </div>
  );
}

function OrbitGraphic() {
  return (
    <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)",
          opacity: 0.25,
          filter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 18,
          borderRadius: "50%",
          background: "var(--gold)",
          boxShadow: "0 0 24px var(--gold-ring)",
        }}
      />
      {[0, 1].map((ring) => (
        <motion.div
          key={ring}
          animate={{ rotate: 360 }}
          transition={{ duration: 10 + ring * 6, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            inset: ring === 0 ? 0 : 8,
            borderRadius: "50%",
            border: "1px solid var(--border-bright)",
          }}
        >
          <span
            style={{
              position: "absolute",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: ring === 0 ? "var(--chart-1)" : "var(--chart-5)",
              top: -3.5,
              left: "50%",
              marginLeft: -3.5,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

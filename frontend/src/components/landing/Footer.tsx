"use client";

import Link from "next/link";
import { motion } from "motion/react";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "/privacy", label: "Privacy" },
];

export default function LandingFooter() {
  return (
    <footer style={{ position: "relative", marginTop: "clamp(64px, 10vw, 120px)" }}>
      <div
        aria-hidden="true"
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--border-bright), transparent)",
        }}
      />
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            className="row"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-dim)" }}
          >
            <motion.span
              aria-hidden="true"
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              style={{
                display: "inline-flex",
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "1.5px solid var(--gold)",
                position: "relative",
                marginRight: 8,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: "var(--gold)",
                  top: -1,
                  left: "50%",
                  marginLeft: -1.5,
                }}
              />
            </motion.span>
            ORBIT DRIVE
          </div>
          <span className="muted" style={{ fontSize: 12.5 }}>
            One drive. Your Google accounts, pooled. &copy; {new Date().getFullYear()} &middot; Built by{" "}
            <a
              href="https://orbitailabs.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="muted"
              style={{ fontSize: 12.5, textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              Orbit AI Labs
            </a>
          </span>
        </div>

        <nav className="row" style={{ gap: 24, flexWrap: "wrap" }}>
          {LINKS.map((link) =>
            link.href.startsWith("#") ? (
              <a key={link.href} href={link.href} className="muted" style={{ fontSize: 13.5, fontWeight: 500 }}>
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} className="muted" style={{ fontSize: 13.5, fontWeight: 500 }}>
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}

"use client";

import type { ComponentType } from "react";
import { motion } from "motion/react";
import { ShieldIcon, LockIcon, KeyOffIcon, TrashIcon } from "@/components/icons";

type Point = {
  icon: ComponentType<{ size?: number }>;
  title: string;
  body: string;
};

const POINTS: Point[] = [
  {
    icon: ShieldIcon,
    title: "Zero file storage, by design",
    body: "Orbit has no storage layer of its own. Every file you upload lives only in your own Google Drive.",
  },
  {
    icon: LockIcon,
    title: "The narrowest access there is",
    body: "We request Google's drive.file scope only — Orbit can see just the files it created, nothing else in your Drive.",
  },
  {
    icon: KeyOffIcon,
    title: "No passwords, ever",
    body: "Sign-in runs entirely through Google's OAuth with PKCE. We never see or store your Google password.",
  },
  {
    icon: TrashIcon,
    title: "Disconnect and it's gone — instantly",
    body: "Remove an account and its tokens are deleted from our database immediately. Nothing lingers.",
  },
];

export default function SecurityBanner() {
  return (
    <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border-bright)",
          background: "linear-gradient(155deg, var(--void-1), var(--void-2) 65%)",
          padding: "clamp(36px, 6vw, 60px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "clamp(32px, 5vw, 64px)",
          alignItems: "start",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -140,
            left: -60,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--gold-wash), transparent 70%)",
            filter: "blur(10px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative" }}>
          <h2
            style={{
              fontSize: "clamp(28px, 4.2vw, 42px)",
              lineHeight: 1.12,
              fontWeight: 800,
              textWrap: "balance",
            }}
          >
            We never store your files.{" "}
            <span
              style={{
                backgroundImage: "linear-gradient(120deg, var(--gold-bright), var(--gold))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Not once.
            </span>
          </h2>

          <p className="muted" style={{ fontSize: 15.5, lineHeight: 1.7, marginTop: 18, maxWidth: 420 }}>
            Everything you upload stays on Google&rsquo;s own servers, in your own Drive. Orbit only keeps a map of
            where it lives — there is nothing of yours sitting on our infrastructure to lose, leak, or subpoena.
          </p>

          <motion.a
            href="/privacy"
            whileHover={{ x: 3 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="row"
            style={{ marginTop: 22, fontSize: 13.5, fontWeight: 600, gap: 6, width: "fit-content" }}
          >
            Read the full privacy policy →
          </motion.a>
        </div>

        <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
          {POINTS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, x: 14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              className="row"
              style={{
                alignItems: "flex-start",
                gap: 16,
                padding: "16px 4px",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <div style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1 }}>
                <p.icon size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 700 }}>{p.title}</h3>
                <p className="muted" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.6 }}>
                  {p.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

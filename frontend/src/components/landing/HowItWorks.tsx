"use client";

import { motion } from "motion/react";
import { SectionHeading } from "./FeatureGrid";
import { GoogleMark, LayersIcon, RouteIcon } from "@/components/icons";

const STEPS = [
  {
    icon: GoogleMark,
    title: "Continue with Google",
    body: "Sign in once. That account becomes your first pooled drive automatically — no separate signup, no password to remember.",
  },
  {
    icon: LayersIcon,
    title: "Add every account you've got",
    body: "Connect your second Gmail. Your third. However many you're sitting on. Each one adds its free storage straight into the pool.",
  },
  {
    icon: RouteIcon,
    title: "Upload, search, forget the plumbing",
    body: "From here it's one drive. Orbit decides which account actually holds each file — you just use it.",
  },
];

export default function HowItWorks() {
  return (
    <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
      <SectionHeading
        eyebrow="How it works"
        title="Three steps. Then you never think about it again."
      />

      <div style={{ position: "relative", marginTop: 56 }}>
        <div
          className="how-it-works-line"
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 27,
            left: "16.5%",
            right: "16.5%",
            height: 2,
            overflow: "hidden",
            borderRadius: 2,
          }}
        >
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: "100%",
              width: "100%",
              transformOrigin: "left",
              background: "linear-gradient(90deg, var(--chart-1), var(--gold), var(--chart-4))",
            }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 32,
          }}
        >
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{ textAlign: "center", position: "relative" }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--void-1)",
                  border: "1px solid var(--border-bright)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                  position: "relative",
                  zIndex: 1,
                  color: "var(--gold)",
                }}
              >
                {i === 0 &&
                  [0, 1].map((ring) => (
                    <motion.span
                      key={ring}
                      aria-hidden="true"
                      animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: ring * 1.1 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        border: "1px solid var(--gold)",
                      }}
                    />
                  ))}
                {i === 1 && (
                  <motion.span
                    aria-hidden="true"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    style={{ position: "absolute", inset: 0 }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: -3,
                        left: "50%",
                        marginLeft: -3,
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--chart-3)",
                        boxShadow: "0 0 6px var(--chart-3)",
                      }}
                    />
                  </motion.span>
                )}
                {i === 2 && (
                  <motion.span
                    aria-hidden="true"
                    animate={{ x: [-9, 9, -9] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      position: "absolute",
                      top: 6,
                      left: "50%",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "var(--chart-4)",
                      boxShadow: "0 0 6px var(--chart-4)",
                    }}
                  />
                )}
                <step.icon size={22} />
                <span
                  className="mono"
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "var(--gold)",
                    color: "#1a1204",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i + 1}
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontFamily: "var(--font-body)", fontWeight: 700, marginTop: 18 }}>
                {step.title}
              </h3>
              <p className="muted" style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.6 }}>
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

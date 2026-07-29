"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { SectionHeading } from "./FeatureGrid";

type Status = "Coming soon" | "In development" | "Exploring";

const STATUS_COLOR: Record<Status, string> = {
  "In development": "var(--good)",
  "Coming soon": "var(--gold)",
  Exploring: "var(--text-dim)",
};

const ROADMAP: { title: string; body: string; status: Status }[] = [
  {
    title: "More clouds, one orbit",
    body: "Dropbox, OneDrive, and iCloud joining the pool — the same one-drive experience across every storage account you own, not just Google's.",
    status: "Coming soon",
  },
  {
    title: "Auto-rebalancing",
    body: "A background pass that quietly shifts files between accounts as quotas shift, so no single account ever creeps toward full while another sits empty.",
    status: "In development",
  },
  {
    title: "Orbit for Android",
    body: "A native app so your pooled storage is one tap away — upload from your camera roll, browse, search, all without opening a browser.",
    status: "Coming soon",
  },
  {
    title: "Shared & team orbits",
    body: "Pool storage across a whole team, with permissions — one shared vault built from everyone's individual accounts.",
    status: "Exploring",
  },
  {
    title: "Smart storage insights",
    body: "Surfaces what's actually eating your space and suggests what's safe to clean up, before you're forced to think about it.",
    status: "Exploring",
  },
];

export default function Roadmap() {
  return (
    <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
      <SectionHeading
        eyebrow="What's next in orbit"
        title="This is version one. The pool is about to get a lot bigger."
        sub="Google Drive is where Orbit started, not where it stops."
      />

      <div style={{ marginTop: 48 }}>
        {ROADMAP.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="timeline-item"
            style={{ "--dot-color": STATUS_COLOR[item.status] } as CSSProperties}
          >
            <span
              className="mono"
              style={{
                display: "inline-block",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: STATUS_COLOR[item.status],
                border: `1px solid ${STATUS_COLOR[item.status]}`,
                borderRadius: 20,
                padding: "3px 10px",
                opacity: 0.9,
                marginBottom: 10,
              }}
            >
              {item.status}
            </span>
            <h3 style={{ fontSize: 16, fontFamily: "var(--font-body)", fontWeight: 700 }}>{item.title}</h3>
            <p className="muted" style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.6, maxWidth: 520 }}>
              {item.body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

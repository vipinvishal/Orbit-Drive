"use client";

import type { ComponentType } from "react";
import { motion } from "motion/react";
import {
  LayersIcon,
  RouteIcon,
  CopyIcon,
  SearchIcon,
  EyeIcon,
  TrashIcon,
  ShieldIcon,
  RefreshIcon,
} from "@/components/icons";
import { handleSpotlight } from "@/lib/spotlight";

type FeatureItem = {
  icon: ComponentType<{ size?: number }>;
  title: string;
  body: string;
  featured: boolean;
  illustration?: ComponentType;
};

const FEATURES: FeatureItem[] = [
  {
    icon: LayersIcon,
    title: "One vault, every account",
    body: "Connect as many Gmail accounts as you own and browse them as a single drive. No switching tabs, no remembering which login has which file.",
    featured: true,
    illustration: PoolIllustration,
  },
  {
    icon: RouteIcon,
    title: "Smart placement engine",
    body: "Every upload is silently routed to whichever pooled account actually has room. You never choose — Orbit always knows.",
    featured: false,
  },
  {
    icon: CopyIcon,
    title: "Instant deduplication",
    body: "Files are fingerprinted by content, not name. Upload the same file twice and Orbit links it instead of burning storage twice.",
    featured: false,
  },
  {
    icon: SearchIcon,
    title: "Search everywhere, once",
    body: "One search bar reaches into every connected account at once — full-text, instant, no per-account digging.",
    featured: false,
  },
  {
    icon: EyeIcon,
    title: "Full account visibility",
    body: "Curious what's living where? Open any connected account and see exactly what it's holding, folder by folder.",
    featured: false,
  },
  {
    icon: TrashIcon,
    title: "Deletion that's actually real",
    body: "Delete a file — or a whole folder tree — and it's gone from Google Drive itself, not just hidden in Orbit. One confirmation, fully recursive, no orphaned files left behind.",
    featured: true,
    illustration: DeleteIllustration,
  },
  {
    icon: ShieldIcon,
    title: "Bank-grade by default",
    body: "OAuth with PKCE, tokens encrypted at rest, and the narrow drive.file scope — Orbit only ever touches what it created.",
    featured: false,
  },
  {
    icon: RefreshIcon,
    title: "Built to never drop a byte",
    body: "A background reliability layer retries failed uploads and watches account health continuously, so nothing silently fails.",
    featured: false,
  },
];

// Small live demos embedded in the two featured cards — showing the pooling
// and the real-deletion behavior in miniature, rather than another static icon.
function PoolIllustration() {
  const sources = [
    { y: 14, color: "var(--chart-1)" },
    { y: 30, color: "var(--chart-3)" },
    { y: 46, color: "var(--chart-5)" },
  ];
  return (
    <svg viewBox="0 0 240 60" width="100%" height={56}>
      {sources.map((s, i) => (
        <path key={i} d={`M18,${s.y} Q120,${s.y} 206,30`} fill="none" stroke="var(--border-bright)" strokeWidth={1} strokeDasharray="1 5" opacity={0.6} />
      ))}
      {sources.map((s, i) => (
        <circle key={i} r={2} fill={s.color}>
          <animateMotion dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.5}s`} path={`M18,${s.y} Q120,${s.y} 206,30`} />
        </circle>
      ))}
      {sources.map((s, i) => (
        <circle key={i} cx={18} cy={s.y} r={5} fill={s.color} fillOpacity={0.25} stroke={s.color} strokeWidth={1.3} />
      ))}
      <circle cx={206} cy={30} r={15} fill="var(--gold-wash)" stroke="var(--gold)" strokeWidth={1.4} />
      <circle cx={206} cy={30} r={4} fill="var(--gold)" />
    </svg>
  );
}

function DeleteIllustration() {
  const iconStroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 240 60" width="100%" height={56}>
      <motion.g
        animate={{ x: [0, 148, 148], scale: [1, 0.35, 0.35], opacity: [1, 1, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.7, times: [0, 0.62, 1], ease: [0.4, 0, 0.6, 1] }}
        style={{ transformOrigin: "26px 30px" }}
      >
        <g transform="translate(14,18)" color="var(--text-dim)" {...iconStroke}>
          <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
          <path d="M14 2v6h6" />
        </g>
      </motion.g>
      <motion.g
        animate={{ scale: [1, 1, 1.2, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.7, times: [0, 0.6, 0.72, 1], ease: "easeOut" }}
        style={{ transformOrigin: "196px 32px" }}
      >
        <g transform="translate(184,18)" color="var(--critical)" {...iconStroke}>
          <path d="M4 7h16" />
          <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
          <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
        </g>
      </motion.g>
    </svg>
  );
}

export default function FeatureGrid() {
  return (
    <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
      <SectionHeading
        eyebrow="Everything, already built"
        title="Not a roadmap. Shipped, working, in your browser right now."
        sub="Every capability below is live in the product today — nothing here is a mockup."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: 16,
          marginTop: 44,
        }}
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            onMouseMove={handleSpotlight}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 4) * 0.08, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, borderColor: "var(--border-bright)" }}
            className="card spotlight-card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              background: f.featured ? "linear-gradient(150deg, var(--void-1), var(--void-2))" : undefined,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                width: 40,
                height: 40,
                borderRadius: 11,
                background: "var(--gold-wash)",
                color: "var(--gold)",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <f.icon size={18} />
            </span>
            <div>
              <h3 style={{ fontSize: 15.5, fontFamily: "var(--font-body)", fontWeight: 700 }}>{f.title}</h3>
              <p className="muted" style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.6 }}>
                {f.body}
              </p>
            </div>
            {f.illustration && (
              <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <f.illustration />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        textAlign: align,
        maxWidth: align === "center" ? 620 : undefined,
        margin: align === "center" ? "0 auto" : undefined,
      }}
    >
      <span
        className="mono"
        style={{
          color: "var(--gold)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </span>
      <h2 style={{ fontSize: "clamp(24px, 4vw, 34px)", marginTop: 10, lineHeight: 1.25 }}>{title}</h2>
      {sub && (
        <p className="muted" style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6 }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

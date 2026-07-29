"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import OrbitRing, { ringSubtext } from "@/components/OrbitRing";
import { formatBytes } from "@/lib/format";
import type { GoogleAccount, StorageSummary as StorageSummaryType } from "@/lib/types";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

export default function StorageSummary({
  summary,
  accounts,
}: {
  summary: StorageSummaryType | null;
  accounts?: GoogleAccount[] | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasAccounts = !!accounts && accounts.length > 0;

  if (!summary) {
    return (
      <div className="card row" style={{ height: 96, alignItems: "center", color: "var(--text-faint)" }}>
        <span className="spinner" /> Reading pooled storage…
      </div>
    );
  }

  return (
    <div className="card">
      <div
        className="row storage-summary-row"
        style={{ gap: 24, cursor: hasAccounts ? "pointer" : "default" }}
        onClick={() => hasAccounts && setExpanded((v) => !v)}
      >
        <OrbitRing
          used={summary.used_quota_bytes}
          total={summary.total_quota_bytes}
          size={112}
          strokeWidth={10}
          centerValue={formatBytes(summary.used_quota_bytes)}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="muted" style={{ letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 11 }}>
            Pooled storage
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {ringSubtext(summary.used_quota_bytes, summary.total_quota_bytes)}
          </div>
          <div className="muted mono" style={{ marginTop: 2 }}>
            {formatBytes(summary.remaining_bytes)} free across {accounts?.length ?? 0}{" "}
            {accounts?.length === 1 ? "account" : "accounts"}
          </div>
        </div>
        {hasAccounts && (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="muted"
            style={{ fontSize: 18, flexShrink: 0 }}
          >
            ⌄
          </motion.span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && hasAccounts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 16,
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid var(--border)",
              }}
            >
              {accounts!.map((account, i) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="stack"
                  style={{ alignItems: "center", textAlign: "center" }}
                >
                  <OrbitRing
                    used={account.used_quota_bytes ?? 0}
                    total={account.total_quota_bytes ?? 1}
                    size={84}
                    strokeWidth={8}
                    color={CHART_COLORS[i % CHART_COLORS.length]}
                    delay={i * 0.06}
                  />
                  <div style={{ fontSize: 12.5, wordBreak: "break-word" }}>{account.google_email}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>
                    {account.total_quota_bytes != null && account.used_quota_bytes != null
                      ? ringSubtext(account.used_quota_bytes, account.total_quota_bytes)
                      : "quota unknown"}
                  </div>
                  {account.status !== "active" && (
                    <span style={{ fontSize: 11, color: "var(--critical)", fontWeight: 600 }}>{account.status}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

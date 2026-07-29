"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { apiFetch } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import { FolderIcon, BarChartIcon, LogOutIcon, CloseIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import type { GoogleAccount, StorageBreakdown, StorageSummary } from "@/lib/types";

const QUOTA_WARN_THRESHOLD = 0.9;
const WARNED_STORAGE_KEY = "orbit_drive_quota_warned";

function getWarnedAccountIds(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(WARNED_STORAGE_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function markAccountWarned(id: string) {
  const ids = getWarnedAccountIds();
  ids.add(id);
  sessionStorage.setItem(WARNED_STORAGE_KEY, JSON.stringify([...ids]));
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "All Files", icon: FolderIcon },
  { href: "/accounts", label: "Storage", icon: BarChartIcon },
];

const CATEGORIES: { key: keyof StorageBreakdown; label: string; color: string }[] = [
  { key: "images_bytes", label: "Photos", color: "var(--chart-1)" },
  { key: "videos_bytes", label: "Videos", color: "var(--chart-5)" },
  { key: "documents_bytes", label: "Documents", color: "var(--chart-3)" },
  { key: "other_bytes", label: "Other", color: "var(--chart-4)" },
];

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export default function Sidebar({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [accounts, setAccounts] = useState<GoogleAccount[] | null>(null);

  const load = useCallback(async () => {
    try {
      const [summaryResult, breakdownResult, accountsResult] = await Promise.all([
        apiFetch<StorageSummary>("/storage/summary"),
        apiFetch<StorageBreakdown>("/storage/breakdown"),
        apiFetch<GoogleAccount[]>("/accounts"),
      ]);
      setSummary(summaryResult);
      setBreakdown(breakdownResult);
      setAccounts(accountsResult);

      // Proactive nudge before an account fills up mid-upload — once per
      // account per browser tab session, not on every sidebar reload.
      const warned = getWarnedAccountIds();
      for (const account of accountsResult) {
        if (account.status !== "active" || !account.total_quota_bytes || account.used_quota_bytes == null) continue;
        const pct = account.used_quota_bytes / account.total_quota_bytes;
        if (pct >= QUOTA_WARN_THRESHOLD && !warned.has(account.id)) {
          toast.show(`${account.google_email} is ${Math.round(pct * 100)}% full — running low on room.`, "info", { duration: 6000 });
          markAccountWarned(account.id);
        }
      }
    } catch {
      // sidebar widgets are non-critical — leave them in their loading state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function handleLogout() {
    clearToken();
    onNavigate?.();
    router.push("/");
  }

  const primaryEmail = accounts && accounts.length > 0 ? accounts[0].google_email : null;
  const categorizedTotal = breakdown
    ? breakdown.images_bytes + breakdown.videos_bytes + breakdown.documents_bytes + breakdown.other_bytes
    : 0;

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        background: "var(--void-1)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div className="between" style={{ padding: "20px 18px", borderBottom: "1px solid var(--border)" }}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="row"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text)", fontSize: 14, gap: 8 }}
        >
          <motion.span
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            style={{
              display: "inline-flex",
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: "1.5px solid var(--gold)",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "var(--gold)",
                top: -1.5,
                left: "50%",
                marginLeft: -2,
              }}
            />
          </motion.span>
          ORBIT DRIVE
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="secondary"
            aria-label="Close menu"
            style={{ padding: 6, borderRadius: "50%", lineHeight: 0 }}
          >
            <CloseIcon size={12} />
          </button>
        )}
      </div>

      <div className="row" style={{ padding: "16px 18px", gap: 10, borderBottom: "1px solid var(--border)" }}>
        <span
          className="mono"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--gold-wash)",
            color: "var(--gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {primaryEmail ? initials(primaryEmail) : "…"}
        </span>
        <span style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-dim)" }}>
          {primaryEmail ?? "Loading…"}
        </span>
      </div>

      <nav style={{ padding: "14px 10px", display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="row"
              style={{
                gap: 10,
                padding: "9px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                color: active ? "var(--gold)" : "var(--text-dim)",
                background: active ? "var(--gold-wash)" : "transparent",
                position: "relative",
              }}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "16px 18px", borderTop: "1px solid var(--border)" }}>
        {breakdown && summary ? (
          <>
            <div style={{ display: "flex", height: 6, borderRadius: 4, overflow: "hidden", background: "var(--void-3)" }}>
              {CATEGORIES.map((cat) => {
                const value = breakdown[cat.key];
                const pct = categorizedTotal > 0 ? (value / categorizedTotal) * 100 : 0;
                return pct > 0 ? <div key={cat.key} style={{ width: `${pct}%`, background: cat.color }} /> : null;
              })}
            </div>
            <div className="stack" style={{ gap: 5, marginTop: 10 }}>
              {CATEGORIES.map((cat) => (
                <div key={cat.key} className="row" style={{ justifyContent: "space-between", fontSize: 11.5 }}>
                  <span className="row" style={{ gap: 6, color: "var(--text-dim)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                    {cat.label}
                  </span>
                  <span className="mono" style={{ color: "var(--text-faint)" }}>
                    {formatBytes(breakdown[cat.key])}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                {formatBytes(summary.used_quota_bytes)} used of {formatBytes(summary.total_quota_bytes)}
              </div>
            </div>
          </>
        ) : (
          <div className="muted" style={{ fontSize: 12 }}>
            Reading storage…
          </div>
        )}
        <button
          onClick={handleLogout}
          className="row secondary"
          style={{ gap: 8, marginTop: 14, width: "100%", justifyContent: "center", fontSize: 12.5 }}
        >
          <LogOutIcon size={13} />
          Log out
        </button>
      </div>
    </aside>
  );
}

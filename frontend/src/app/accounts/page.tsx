"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { API_BASE_URL, apiFetch, ApiError } from "@/lib/api";
import { getToken, useRequireAuth } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import StorageSummary from "@/components/StorageSummary";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import Modal from "@/components/Modal";
import AccountFilesPanel from "@/components/AccountFilesPanel";
import AppShell from "@/components/AppShell";
import { OrbitBreakIcon, PlusIcon, RefreshIcon, GoogleMark, BarChartIcon, RouteIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { handleSpotlight } from "@/lib/spotlight";
import { SkeletonCircle, SkeletonLine, SkeletonBlock } from "@/components/Skeleton";
import type { GoogleAccount, OrbitFile, RebalanceResult, StorageBreakdown, StorageSummary as StorageSummaryType } from "@/lib/types";

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsPageContent />
    </Suspense>
  );
}

function accountUsagePct(account: GoogleAccount): number {
  if (!account.total_quota_bytes || account.used_quota_bytes == null) return 0;
  return Math.min((account.used_quota_bytes / account.total_quota_bytes) * 100, 100);
}

function usageColor(pct: number): string {
  if (pct >= 95) return "var(--critical)";
  if (pct >= 85) return "var(--warning)";
  return "var(--gold)";
}

function AccountsPageContent() {
  const token = useRequireAuth();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "1";
  const toast = useToast();

  const [accounts, setAccounts] = useState<GoogleAccount[] | null>(null);
  const [summary, setSummary] = useState<StorageSummaryType | null>(null);
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [rebalancing, setRebalancing] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [sortByAvailable, setSortByAvailable] = useState(false);

  const [disconnectTarget, setDisconnectTarget] = useState<{ id: string; email: string } | null>(null);
  const [disconnectFiles, setDisconnectFiles] = useState<OrbitFile[] | null>(null);
  const [disconnectBusy, setDisconnectBusy] = useState<"untrack" | "delete" | null>(null);

  const [viewFilesTarget, setViewFilesTarget] = useState<{ id: string; email: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [accountsResult, summaryResult, breakdownResult] = await Promise.all([
        apiFetch<GoogleAccount[]>("/accounts"),
        apiFetch<StorageSummaryType>("/storage/summary"),
        apiFetch<StorageBreakdown>("/storage/breakdown"),
      ]);
      setAccounts(accountsResult);
      setSummary(summaryResult);
      setBreakdown(breakdownResult);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to load accounts", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) load();
  }, [token, load]);

  useEffect(() => {
    if (justConnected) toast.show("Google account connected.", "success");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justConnected]);

  function handleConnect() {
    const currentToken = getToken();
    if (!currentToken) return;
    setConnecting(true);
    window.location.href = `${API_BASE_URL}/accounts/google/connect?access_token=${encodeURIComponent(currentToken)}`;
  }

  async function handleRefreshQuota(accountId: string) {
    setRefreshingId(accountId);
    try {
      await apiFetch(`/accounts/${accountId}/refresh-quota`, { method: "POST" });
      await load();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to refresh quota", "error");
    } finally {
      setRefreshingId(null);
    }
  }

  async function handleRebalance() {
    setRebalancing(true);
    try {
      const result = await apiFetch<RebalanceResult>("/accounts/rebalance", { method: "POST" });
      toast.show(result.message, result.moved_files > 0 ? "success" : "info");
      if (result.moved_files > 0) await load();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to rebalance", "error");
    } finally {
      setRebalancing(false);
    }
  }

  async function handleDisconnect(id: string, email: string) {
    // Always confirm through the modal — even an empty account still
    // deserves a deliberate "are you sure", not an instant delete.
    setDisconnectTarget({ id, email });
    setDisconnectFiles(null);
    try {
      setDisconnectFiles(await apiFetch<OrbitFile[]>(`/accounts/${id}/files`));
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to load account details", "error");
      setDisconnectTarget(null);
    }
  }

  function closeDisconnectModal() {
    if (disconnectBusy) return;
    setDisconnectTarget(null);
    setDisconnectFiles(null);
  }

  async function confirmDisconnect(deleteFromDrive: boolean) {
    if (!disconnectTarget) return;
    setDisconnectBusy(deleteFromDrive ? "delete" : "untrack");
    try {
      await apiFetch(`/accounts/${disconnectTarget.id}`, {
        method: "DELETE",
        query: { force: "true", delete_from_drive: deleteFromDrive ? "true" : "false" },
      });
      toast.show(
        deleteFromDrive
          ? `${disconnectTarget.email} disconnected and its files deleted from Drive.`
          : `${disconnectTarget.email} disconnected.`,
        "success",
      );
      setDisconnectTarget(null);
      setDisconnectFiles(null);
      await load();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to disconnect", "error");
    } finally {
      setDisconnectBusy(null);
    }
  }

  if (!token) return null;

  const sortedAccounts = accounts
    ? [...accounts].sort((a, b) => {
        if (!sortByAvailable) return 0;
        const availableA = (a.total_quota_bytes ?? 0) - (a.used_quota_bytes ?? 0);
        const availableB = (b.total_quota_bytes ?? 0) - (b.used_quota_bytes ?? 0);
        return availableB - availableA;
      })
    : null;

  return (
    <AppShell>
      <div className="page stack" style={{ gap: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="row"
          style={{ gap: 14 }}
        >
          <span
            style={{
              display: "inline-flex",
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--gold-wash)",
              color: "var(--gold)",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BarChartIcon size={20} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h1 style={{ fontSize: 28 }}>Storage</h1>
            <p className="muted" style={{ fontSize: 13.5 }}>
              Every Google account you connect pools its storage into your one drive.
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }}>
          <StorageSummary summary={summary} accounts={accounts} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
          <CategoryBreakdown breakdown={breakdown} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="between"
          style={{ flexWrap: "wrap", gap: 12 }}
        >
          <h2 style={{ fontSize: 16, fontFamily: "var(--font-body)", fontWeight: 700 }}>Connected accounts</h2>
          <div className="row" style={{ gap: 10 }}>
            {accounts && accounts.length > 1 && (
              <button
                className="secondary"
                onClick={() => setSortByAvailable((v) => !v)}
                style={{ fontSize: 13, color: sortByAvailable ? "var(--gold)" : undefined }}
              >
                {sortByAvailable ? "Sorted: most available" : "Sort by available"}
              </button>
            )}
            {accounts && accounts.length > 1 && (
              <button
                className="secondary row"
                style={{ gap: 6, fontSize: 13 }}
                onClick={handleRebalance}
                disabled={rebalancing}
                title="Move files from your fullest account to whichever has the most free room"
              >
                {rebalancing ? (
                  <span className="row">
                    <span className="spinner" /> Rebalancing…
                  </span>
                ) : (
                  <>
                    <RouteIcon size={14} />
                    Rebalance now
                  </>
                )}
              </button>
            )}
            <button onClick={handleConnect} disabled={connecting} className="row" style={{ gap: 6 }}>
              {connecting ? (
                <span className="row">
                  <span className="spinner" /> Redirecting…
                </span>
              ) : (
                <>
                  <PlusIcon size={14} />
                  Add another Google Account
                </>
              )}
            </button>
          </div>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {accounts === null &&
            [1, 2, 3].map((i) => (
              <div key={i} className="card">
                <div className="row" style={{ gap: 10 }}>
                  <SkeletonCircle size={34} />
                  <div className="stack" style={{ gap: 6, flex: 1 }}>
                    <SkeletonLine width="50%" height={14} />
                    <SkeletonLine width="75%" height={11} />
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <SkeletonLine height={6} />
                </div>
                <div className="row" style={{ marginTop: 16, gap: 8 }}>
                  <SkeletonBlock height={34} />
                  <SkeletonBlock width={80} height={34} />
                </div>
              </div>
            ))}
          {accounts?.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card"
              style={{ textAlign: "center", padding: 40, color: "var(--text-dim)", gridColumn: "1 / -1" }}
            >
              No Google accounts connected yet. Connect one to start pooling storage.
            </motion.div>
          )}
          <AnimatePresence>
            {sortedAccounts?.map((account, i) => {
              const pct = accountUsagePct(account);
              const color = usageColor(pct);
              const available =
                account.total_quota_bytes != null && account.used_quota_bytes != null
                  ? account.total_quota_bytes - account.used_quota_bytes
                  : null;
              return (
                <motion.div
                  key={account.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  onMouseMove={handleSpotlight}
                  className="card spotlight-card"
                >
                  <div className="between">
                    <div className="row" style={{ gap: 10, minWidth: 0 }}>
                      <span
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <GoogleMark size={17} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>Google Drive</div>
                        <div
                          className="muted mono"
                          style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {account.google_email}
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.08, backgroundColor: "var(--void-3)" }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleRefreshQuota(account.id)}
                      disabled={refreshingId === account.id}
                      aria-label="Refresh quota"
                      className="secondary"
                      style={{ padding: 7, borderRadius: "50%", lineHeight: 0, border: "1px solid transparent", background: "transparent", color: "var(--text-dim)", flexShrink: 0 }}
                    >
                      <motion.span
                        animate={refreshingId === account.id ? { rotate: 360 } : {}}
                        transition={{ duration: 0.7, repeat: refreshingId === account.id ? Infinity : 0, ease: "linear" }}
                        style={{ display: "flex" }}
                      >
                        <RefreshIcon size={14} />
                      </motion.span>
                    </motion.button>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div className="between" style={{ fontSize: 12 }}>
                      <span
                        className="row"
                        style={{ gap: 6, color: account.status === "active" ? "var(--text-dim)" : "var(--critical)", fontWeight: account.status === "active" ? 400 : 600 }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: account.status === "active" ? color : "var(--critical)" }} />
                        {account.status === "active" ? "storage" : account.status}
                      </span>
                      <span className="mono muted">{Math.round(pct)}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: "var(--void-3)", marginTop: 7, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: "100%", background: color }}
                      />
                    </div>
                    <div className="between mono muted" style={{ fontSize: 11, marginTop: 7 }}>
                      <span>
                        {account.total_quota_bytes != null && account.used_quota_bytes != null
                          ? `${formatBytes(account.used_quota_bytes)} / ${formatBytes(account.total_quota_bytes)}`
                          : "Quota unknown"}
                      </span>
                      {available != null && <span>Available {formatBytes(available)}</span>}
                    </div>
                  </div>

                  {account.status !== "active" && (
                    <button className="row" style={{ marginTop: 16, gap: 8, width: "100%", justifyContent: "center" }} onClick={handleConnect} disabled={connecting}>
                      {connecting ? (
                        <span className="row">
                          <span className="spinner" /> Redirecting…
                        </span>
                      ) : (
                        <>
                          <RefreshIcon size={14} />
                          Reconnect this account
                        </>
                      )}
                    </button>
                  )}
                  <div className="row" style={{ marginTop: account.status !== "active" ? 8 : 16, gap: 8 }}>
                    <button
                      className="secondary"
                      style={{ flex: 1 }}
                      onClick={() => setViewFilesTarget({ id: account.id, email: account.google_email })}
                    >
                      View files
                    </button>
                    <button className="danger" onClick={() => handleDisconnect(account.id, account.google_email)}>
                      Disconnect
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <AccountFilesPanel account={viewFilesTarget} onClose={() => setViewFilesTarget(null)} />

        <Modal
          open={disconnectTarget !== null}
          onClose={closeDisconnectModal}
          title={
            <span className="row" style={{ gap: 10 }}>
              <span style={{ color: "var(--critical)", display: "inline-flex" }}>
                <OrbitBreakIcon size={17} />
              </span>
              <span>
                Disconnect account
                <div className="muted mono" style={{ fontSize: 12, fontWeight: 400, marginTop: 2 }}>
                  {disconnectTarget?.email}
                </div>
              </span>
            </span>
          }
        >
          <div className="stack">
            {disconnectFiles === null ? (
              <div className="muted row">
                <span className="spinner" /> Checking what&rsquo;s stored here…
              </div>
            ) : disconnectFiles.length === 0 ? (
              <>
                <p style={{ margin: 0 }}>
                  This account isn&rsquo;t holding anything — safe to let it go. Once disconnected, Orbit Drive stops
                  pooling its storage; nothing else changes.
                </p>
                <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
                  <button className="secondary" onClick={closeDisconnectModal} disabled={disconnectBusy !== null}>
                    Cancel
                  </button>
                  <button className="danger" style={{ border: "1px solid var(--critical)" }} disabled={disconnectBusy !== null} onClick={() => confirmDisconnect(false)}>
                    {disconnectBusy === "untrack" ? (
                      <span className="row" style={{ justifyContent: "center" }}>
                        <span className="spinner" /> Disconnecting…
                      </span>
                    ) : (
                      "Disconnect"
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="muted" style={{ margin: 0 }}>
                  {disconnectFiles.length} file{disconnectFiles.length === 1 ? "" : "s"} live{disconnectFiles.length === 1 ? "s" : ""} on this account. Decide what happens to
                  {disconnectFiles.length === 1 ? " it" : " them"} before it goes:
                </p>
                <div
                  className="stack"
                  style={{
                    maxHeight: 200,
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: 10,
                    gap: 6,
                  }}
                >
                  {disconnectFiles.map((f) => (
                    <div key={f.id} className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.filename}
                      </span>
                      <span className="muted mono" style={{ flexShrink: 0, marginLeft: 12 }}>
                        {formatBytes(f.size_bytes)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="stack" style={{ marginTop: 8, gap: 10 }}>
                  <button
                    className="secondary"
                    disabled={disconnectBusy !== null}
                    onClick={() => confirmDisconnect(false)}
                  >
                    {disconnectBusy === "untrack" ? (
                      <span className="row" style={{ justifyContent: "center" }}>
                        <span className="spinner" /> Disconnecting…
                      </span>
                    ) : (
                      "Just disconnect — keep files in Google Drive"
                    )}
                  </button>
                  <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                    Orbit Drive lets go of the reference — the files themselves never move. Find them right where you
                    left them in Google Drive.
                  </p>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4 }}>
                    <button
                      className="danger"
                      style={{ width: "100%", border: "1px solid var(--critical)" }}
                      disabled={disconnectBusy !== null}
                      onClick={() => confirmDisconnect(true)}
                    >
                      {disconnectBusy === "delete" ? (
                        <span className="row" style={{ justifyContent: "center" }}>
                          <span className="spinner" /> Deleting from Drive…
                        </span>
                      ) : (
                        "Delete these files from Google Drive too"
                      )}
                    </button>
                    <p className="muted" style={{ margin: "8px 0 0", fontSize: 12, color: "var(--critical)" }}>
                      Wipes them from Google Drive itself, not just Orbit Drive. Once gone, there&rsquo;s no bringing
                      them back.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}

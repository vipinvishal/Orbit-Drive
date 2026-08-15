"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { formatBytes, formatDate } from "@/lib/format";
import AppShell from "@/components/AppShell";
import { UserIcon, CheckIcon, CameraIcon, TrashIcon, CloudIcon, BarChartIcon, LayersIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import type { Me, GoogleAccount, StorageSummary as StorageSummaryType } from "@/lib/types";

function initials(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const token = useRequireAuth();
  const toast = useToast();

  const [me, setMe] = useState<Me | null>(null);
  const [accounts, setAccounts] = useState<GoogleAccount[] | null>(null);
  const [summary, setSummary] = useState<StorageSummaryType | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [meResult, accountsResult, summaryResult] = await Promise.all([
        apiFetch<Me>("/me"),
        apiFetch<GoogleAccount[]>("/accounts"),
        apiFetch<StorageSummaryType>("/storage/summary"),
      ]);
      setMe(meResult);
      setNameValue(meResult.display_name ?? "");
      setAccounts(accountsResult);
      setSummary(summaryResult);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to load profile", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) load();
  }, [token, load]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await apiFetch<Me>("/me", { method: "PATCH", body: { display_name: nameValue } });
      setMe(updated);
      setNameValue(updated.display_name ?? "");
      // Sidebar fetches /me independently and has no shared state with this
      // page — without this, the name it shows stays stale until the next
      // full navigation remounts it.
      window.dispatchEvent(new Event("orbit-drive:profile-updated"));
      toast.show("Profile updated.", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.show("Please choose an image file.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setAvatarBusy(true);
    try {
      const updated = await apiFetch<Me>("/me/avatar", { method: "POST", formData });
      setMe(updated);
      window.dispatchEvent(new Event("orbit-drive:profile-updated"));
      toast.show("Photo updated.", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to upload photo", "error");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarBusy(true);
    try {
      const updated = await apiFetch<Me>("/me/avatar", { method: "DELETE" });
      setMe(updated);
      window.dispatchEvent(new Event("orbit-drive:profile-updated"));
      toast.show("Photo removed.", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to remove photo", "error");
    } finally {
      setAvatarBusy(false);
    }
  }

  if (!token) return null;

  const dirty = me !== null && nameValue.trim() !== (me.display_name ?? "");
  const displayLabel = me?.display_name || me?.email || "";
  const activeAccounts = accounts?.filter((a) => a.status === "active").length ?? 0;

  return (
    <AppShell>
      <div className="page stack" style={{ gap: 24, maxWidth: 980 }}>
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
            <UserIcon size={20} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h1 style={{ fontSize: 28 }}>Profile</h1>
            <p className="muted" style={{ fontSize: 13.5 }}>
              Your corner of the orbit.
            </p>
          </div>
        </motion.div>

        <div className="profile-grid">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="card"
          style={{ position: "relative", overflow: "hidden", padding: "clamp(28px, 5vw, 40px)" }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-40%",
              right: "-10%",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "radial-gradient(circle, var(--gold-wash), transparent 70%)",
              filter: "blur(10px)",
              pointerEvents: "none",
            }}
          />

          <div className="row" style={{ position: "relative", gap: 18, flexWrap: "wrap" }}>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              style={{ display: "none" }}
            />
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}
            >
              <span
                className="mono"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "var(--gold-wash)",
                  border: "1px solid var(--gold-ring)",
                  color: "var(--gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  overflow: "hidden",
                }}
              >
                {me?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={me.avatar_url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  me ? initials(displayLabel) : "…"
                )}
              </span>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarBusy}
                aria-label="Upload photo"
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--gold)",
                  color: "#1a1204",
                  border: "2px solid var(--void-1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                {avatarBusy ? <span className="spinner" style={{ width: 11, height: 11 }} /> : <CameraIcon size={12} />}
              </motion.button>
            </motion.div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {me?.display_name || "Add your name below"}
              </div>
              <div className="muted mono" style={{ fontSize: 13, marginTop: 3 }}>
                {me?.email ?? "…"}
              </div>
              {me?.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={avatarBusy}
                  className="row"
                  style={{
                    gap: 5,
                    marginTop: 6,
                    padding: 0,
                    background: "transparent",
                    color: "var(--critical)",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <TrashIcon size={12} />
                  Remove photo
                </button>
              )}
              {me && (
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Member since {formatDate(me.created_at)}
                </div>
              )}
            </div>
          </div>

          <div style={{ position: "relative", marginTop: 28, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
            <label htmlFor="display-name" className="muted" style={{ fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Display name
            </label>
            <div className="row" style={{ gap: 10, marginTop: 8 }}>
              <input
                id="display-name"
                type="text"
                placeholder="How should we address you?"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dirty && !saving) handleSave();
                }}
                style={{ flex: 1 }}
              />
              <motion.button
                whileHover={dirty ? { y: -1 } : undefined}
                whileTap={dirty ? { scale: 0.97 } : undefined}
                onClick={handleSave}
                disabled={!dirty || saving}
                className="row"
                style={{ gap: 7, flexShrink: 0 }}
              >
                {saving ? (
                  <span className="row" style={{ gap: 7 }}>
                    <span className="spinner" /> Saving…
                  </span>
                ) : (
                  <>
                    <CheckIcon size={13} />
                    Save
                  </>
                )}
              </motion.button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 8, margin: "8px 0 0" }}>
              This is how you&rsquo;ll show up around Orbit Drive — your email stays tied to Google sign-in and
              can&rsquo;t be changed here.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="card stack"
          style={{ gap: 4 }}
        >
          <h2 style={{ fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 700, marginBottom: 8 }}>Your pool</h2>
          {[
            {
              icon: CloudIcon,
              value: activeAccounts,
              label: activeAccounts === 1 ? "account connected" : "accounts connected",
            },
            {
              icon: BarChartIcon,
              value: summary ? formatBytes(summary.total_quota_bytes) : "…",
              label: "pooled storage",
            },
            {
              icon: LayersIcon,
              value: summary ? formatBytes(summary.used_quota_bytes) : "…",
              label: "in use",
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="row"
              style={{
                gap: 14,
                padding: "14px 2px",
                borderTop: i > 0 ? "1px solid var(--border)" : undefined,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--gold-wash)",
                  color: "var(--gold)",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <stat.icon size={16} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>{stat.value}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 1 }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
        </div>
      </div>
    </AppShell>
  );
}

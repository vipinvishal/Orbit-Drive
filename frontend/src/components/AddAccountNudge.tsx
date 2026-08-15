"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { LayersIcon, CloseIcon } from "@/components/icons";

const DISMISSED_KEY = "orbit_drive_add_account_nudge_dismissed";

// A single connected account isn't "pooled" storage yet — it's just a
// Drive client. This nudges toward the second account, where the actual
// product value (one drive, multiple accounts) kicks in. Dismissal is
// permanent (localStorage, not sessionStorage) since this is a one-time
// suggestion, not a recurring warning — nagging every session would be
// worse than not showing it at all.
export default function AddAccountNudge() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Reading localStorage during render would mismatch the server-rendered
    // (window-less) pass, so this one-time sync has to happen in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  function handleConnect() {
    const token = getToken();
    if (!token) return;
    window.location.href = `${API_BASE_URL}/accounts/google/connect?access_token=${encodeURIComponent(token)}`;
  }

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: "hidden" }}
        >
          <div
            className="row"
            style={{
              gap: 12,
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--gold-ring)",
              background: "var(--gold-wash)",
            }}
          >
            <span style={{ color: "var(--gold)", display: "flex", flexShrink: 0 }}>
              <LayersIcon size={17} />
            </span>
            <span style={{ flex: 1, fontSize: 13.5, minWidth: 0 }}>
              You&rsquo;ve got one account connected. Add another to actually start pooling storage.
            </span>
            <button onClick={handleConnect} className="secondary" style={{ fontSize: 12.5, flexShrink: 0, padding: "7px 12px" }}>
              Add account
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="secondary"
              style={{ padding: 6, borderRadius: "50%", lineHeight: 0, border: "1px solid transparent", background: "transparent", flexShrink: 0 }}
            >
              <CloseIcon size={11} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PlusIcon, CheckIcon, CloseIcon, FolderIcon } from "@/components/icons";

// Replaces a native window.prompt() for folder creation — prompt() is
// unstyled, blocks the whole tab, and looks nothing like the rest of the
// app. This swaps the button in place for a small inline form instead of
// popping a modal, since creating a folder is a frequent, low-stakes action
// that shouldn't need a full dialog.
export default function NewFolderInline({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setName("");
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onCreate(trimmed);
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {open ? (
        <motion.form
          key="form"
          initial={{ opacity: 0, width: 160 }}
          animate={{ opacity: 1, width: 240 }}
          exit={{ opacity: 0, width: 160 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="row"
          style={{
            gap: 6,
            background: "var(--void-1)",
            border: "1px solid var(--gold-ring)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 6px 6px 12px",
          }}
        >
          <span style={{ color: "var(--gold)", flexShrink: 0, display: "flex" }}>
            <FolderIcon size={15} />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
            placeholder="Folder name"
            disabled={busy}
            style={{ border: "none", background: "none", padding: "4px 0", flex: 1, minWidth: 0 }}
          />
          <button
            type="submit"
            disabled={!name.trim() || busy}
            aria-label="Create folder"
            style={{ padding: 6, borderRadius: "50%", lineHeight: 0 }}
          >
            {busy ? <span className="spinner" /> : <CheckIcon size={13} />}
          </button>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="secondary"
            aria-label="Cancel"
            style={{ padding: 6, borderRadius: "50%", lineHeight: 0, border: "1px solid transparent", background: "transparent" }}
          >
            <CloseIcon size={12} />
          </button>
        </motion.form>
      ) : (
        <motion.button
          key="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="secondary row"
          style={{ gap: 6 }}
          onClick={() => setOpen(true)}
        >
          <PlusIcon size={14} />
          New Folder
        </motion.button>
      )}
    </AnimatePresence>
  );
}

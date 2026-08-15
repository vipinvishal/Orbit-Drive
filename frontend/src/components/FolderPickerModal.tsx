"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { apiFetch, ApiError } from "@/lib/api";
import Modal from "@/components/Modal";
import { FolderIcon, HomeIcon, ChevronRightIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";
import type { Folder, FileListResponse } from "@/lib/types";

type Crumb = { id: string | null; name: string };

export default function FolderPickerModal({
  open,
  title,
  excludeFolderId,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  // Hide this folder when browsing — used when moving a folder itself, so
  // it can't be listed as a destination inside its own subtree at the UI
  // level (the backend is still the real authority on that).
  excludeFolderId?: string;
  onClose: () => void;
  onConfirm: (folderId: string | null) => Promise<void>;
}) {
  const toast = useToast();
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: "Home" }]);
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [busy, setBusy] = useState(false);

  const currentId = crumbs[crumbs.length - 1].id;

  const load = useCallback(
    async (folderId: string | null) => {
      try {
        const result = await apiFetch<FileListResponse>("/files", { query: { folder_id: folderId ?? undefined } });
        setFolders(result.folders.filter((f) => f.id !== excludeFolderId));
      } catch (err) {
        toast.show(err instanceof ApiError ? err.message : "Failed to load folders", "error");
      }
    },
    [excludeFolderId, toast],
  );

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCrumbs([{ id: null, name: "Home" }]);
    setFolders(null);
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openFolder(folder: Folder) {
    setCrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setFolders(null);
    load(folder.id);
  }

  function goToCrumb(index: number) {
    setCrumbs((prev) => prev.slice(0, index + 1));
    setFolders(null);
    load(crumbs[index].id);
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm(currentId);
    } catch {
      // caller already surfaced a toast — stay open so the user can retry
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="stack">
        <div className="row" style={{ flexWrap: "wrap", fontSize: 13, gap: 6 }}>
          {crumbs.map((crumb, i) => (
            <span key={`${crumb.id ?? "root"}-${i}`} className="row" style={{ gap: 6 }}>
              {i > 0 && (
                <span className="muted" style={{ display: "flex" }}>
                  <ChevronRightIcon size={12} />
                </span>
              )}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  goToCrumb(i);
                }}
                className="row"
                style={{
                  gap: 4,
                  color: i === crumbs.length - 1 ? "var(--text)" : "var(--gold)",
                  fontWeight: i === crumbs.length - 1 ? 600 : 400,
                }}
              >
                {i === 0 && <HomeIcon size={12} />}
                {crumb.name}
              </a>
            </span>
          ))}
        </div>

        <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          {folders === null ? (
            <div className="stack" style={{ padding: 12, gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="row" style={{ gap: 10, padding: "4px 2px" }}>
                  <SkeletonBlock width={18} height={18} radius={5} />
                  <SkeletonLine width={100 + i * 30} height={12} />
                </div>
              ))}
            </div>
          ) : folders.length === 0 ? (
            <div className="muted" style={{ padding: 16, textAlign: "center", fontSize: 13 }}>
              No subfolders here.
            </div>
          ) : (
            folders.map((folder) => (
              <motion.div
                key={folder.id}
                whileHover={{ backgroundColor: "var(--void-2)" }}
                onClick={() => openFolder(folder)}
                className="row"
                style={{ gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
              >
                <span style={{ color: "var(--gold)", display: "flex" }}>
                  <FolderIcon size={16} />
                </span>
                {folder.name}
              </motion.div>
            ))
          )}
        </div>

        <div className="row" style={{ justifyContent: "flex-end", marginTop: 4 }}>
          <button className="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={busy}>
            {busy ? (
              <span className="row" style={{ justifyContent: "center" }}>
                <span className="spinner" /> Moving…
              </span>
            ) : (
              `Move here — ${crumbs[crumbs.length - 1].name}`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

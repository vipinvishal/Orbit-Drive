"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { TrashIcon, FolderIcon, FileIcon, RefreshIcon, AlertTriangleIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";
import type { TrashListResponse, TrashedFile, TrashedFolder, FolderPurgeResponse, EmptyTrashResponse } from "@/lib/types";

type PurgeTarget = { kind: "file" | "folder"; id: string; name: string } | { kind: "empty" };

export default function TrashPage() {
  const token = useRequireAuth();
  const toast = useToast();

  const [trash, setTrash] = useState<TrashListResponse | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<PurgeTarget | null>(null);
  const [purgeBusy, setPurgeBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setTrash(await apiFetch<TrashListResponse>("/trash"));
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to load Trash", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) load();
  }, [token, load]);

  if (!token) return null;

  async function restoreFile(file: TrashedFile) {
    setBusyId(file.id);
    try {
      await apiFetch(`/trash/files/${file.id}/restore`, { method: "POST" });
      toast.show(`"${file.filename}" restored.`, "success");
      await load();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to restore file", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function restoreFolder(folder: TrashedFolder) {
    setBusyId(folder.id);
    try {
      await apiFetch(`/trash/folders/${folder.id}/restore`, { method: "POST" });
      toast.show(`"${folder.name}" restored.`, "success");
      await load();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to restore folder", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmPurge() {
    if (!purgeTarget) return;
    setPurgeBusy(true);
    try {
      if (purgeTarget.kind === "file") {
        await apiFetch(`/trash/files/${purgeTarget.id}`, { method: "DELETE" });
        toast.show(`"${purgeTarget.name}" deleted forever.`, "success");
      } else if (purgeTarget.kind === "folder") {
        await apiFetch<FolderPurgeResponse>(`/trash/folders/${purgeTarget.id}`, { method: "DELETE" });
        toast.show(`"${purgeTarget.name}" deleted forever.`, "success");
      } else {
        const result = await apiFetch<EmptyTrashResponse>("/trash/empty", { method: "POST" });
        const total = result.files_purged + result.folders_purged;
        toast.show(total > 0 ? "Trash emptied." : "Trash was already empty.", "success");
      }
      setPurgeTarget(null);
      await load();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to delete permanently", "error");
    } finally {
      setPurgeBusy(false);
    }
  }

  const isEmpty = trash !== null && trash.files.length === 0 && trash.folders.length === 0;

  return (
    <AppShell>
      <div className="page stack" style={{ gap: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="between"
          style={{ flexWrap: "wrap", gap: 14 }}
        >
          <div className="row" style={{ gap: 14 }}>
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
              <TrashIcon size={20} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <h1 style={{ fontSize: 28 }}>Trash</h1>
              <p className="muted" style={{ fontSize: 13.5 }}>
                Restore what you didn&rsquo;t mean to delete — everything here is still sitting untouched in your
                Google Drive, and stays that way for 30 days before it&rsquo;s gone for good.
              </p>
            </div>
          </div>
          {!isEmpty && (
            <button className="danger" style={{ border: "1px solid var(--critical)" }} onClick={() => setPurgeTarget({ kind: "empty" })}>
              Empty Trash
            </button>
          )}
        </motion.div>

        {trash === null ? (
          <div className="card stack" style={{ gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="row" style={{ gap: 12, padding: "8px 2px" }}>
                <SkeletonBlock width={32} height={32} radius={8} />
                <div className="stack" style={{ gap: 6, flex: 1 }}>
                  <SkeletonLine width={160 + i * 30} height={13} />
                  <SkeletonLine width={110} height={11} />
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-dim)" }}>
            <TrashIcon size={28} />
            <div style={{ marginTop: 10, fontWeight: 600, color: "var(--text)" }}>Trash is empty</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Deleted files and folders show up here for 30 days before they&rsquo;re gone for good.
            </div>
          </motion.div>
        ) : (
          <div className="stack" style={{ gap: 24 }}>
            {trash.folders.length > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <AnimatePresence>
                  {trash.folders.map((folder, i) => (
                    <motion.div
                      key={folder.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.03 }}
                      className="row"
                      style={{
                        gap: 12,
                        padding: "14px 18px",
                        borderBottom: i === trash.folders.length - 1 && trash.files.length === 0 ? "none" : "1px solid var(--border)",
                      }}
                    >
                      <span style={{ color: "var(--gold)", display: "flex", flexShrink: 0 }}>
                        <FolderIcon size={18} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {folder.name}
                        </div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                          {folder.folder_path ? `Was in ${folder.folder_path} · ` : ""}Trashed {formatDateTime(folder.deleted_at)}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                        <button className="secondary row" style={{ gap: 6 }} disabled={busyId === folder.id} onClick={() => restoreFolder(folder)}>
                          {busyId === folder.id ? <span className="spinner" /> : <RefreshIcon size={13} />}
                          Restore
                        </button>
                        <button
                          className="danger"
                          onClick={() => setPurgeTarget({ kind: "folder", id: folder.id, name: folder.name })}
                        >
                          Delete forever
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {trash.files.length > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <AnimatePresence>
                  {trash.files.map((file, i) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.03 }}
                      className="row"
                      style={{ gap: 12, padding: "14px 18px", borderBottom: i === trash.files.length - 1 ? "none" : "1px solid var(--border)" }}
                    >
                      <span style={{ color: "var(--text-dim)", display: "flex", flexShrink: 0 }}>
                        <FileIcon size={18} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {file.filename}
                        </div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                          {file.folder_path ? `Was in ${file.folder_path} · ` : "Was at Home · "}Trashed {formatDateTime(file.deleted_at)}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                        <button className="secondary row" style={{ gap: 6 }} disabled={busyId === file.id} onClick={() => restoreFile(file)}>
                          {busyId === file.id ? <span className="spinner" /> : <RefreshIcon size={13} />}
                          Restore
                        </button>
                        <button className="danger" onClick={() => setPurgeTarget({ kind: "file", id: file.id, name: file.filename })}>
                          Delete forever
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        <Modal
          open={purgeTarget !== null}
          onClose={() => !purgeBusy && setPurgeTarget(null)}
          title={
            <span className="row" style={{ gap: 10 }}>
              <span style={{ color: "var(--critical)", display: "inline-flex" }}>
                <AlertTriangleIcon size={17} />
              </span>
              {purgeTarget?.kind === "empty" ? "Empty Trash" : "Delete forever"}
            </span>
          }
        >
          <div className="stack">
            <p style={{ margin: 0 }}>
              {purgeTarget === null ? null : purgeTarget.kind === "empty" ? (
                <>Permanently deletes everything in Trash, including real files on Google Drive. This can&rsquo;t be undone.</>
              ) : (
                <>
                  <strong>&ldquo;{purgeTarget.name}&rdquo;</strong>
                  {purgeTarget.kind === "folder" ? " and everything inside it" : ""} will be permanently deleted, including
                  the real file{purgeTarget.kind === "folder" ? "s" : ""} on Google Drive. This can&rsquo;t be undone.
                </>
              )}
            </p>
            <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button className="secondary" onClick={() => setPurgeTarget(null)} disabled={purgeBusy}>
                Cancel
              </button>
              <button className="danger" style={{ border: "1px solid var(--critical)" }} onClick={confirmPurge} disabled={purgeBusy}>
                {purgeBusy ? (
                  <span className="row" style={{ justifyContent: "center" }}>
                    <span className="spinner" /> Deleting…
                  </span>
                ) : (
                  "Delete forever"
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}

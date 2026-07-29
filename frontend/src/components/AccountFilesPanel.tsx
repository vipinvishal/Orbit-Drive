"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { apiFetch, apiDownload, ApiError } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { DownloadIcon, FileIcon, FolderIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import type { AccountFile } from "@/lib/types";

type Group = { path: string | null; files: AccountFile[] };

export default function AccountFilesPanel({
  account,
  onClose,
}: {
  account: { id: string; email: string } | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [files, setFiles] = useState<AccountFile[] | null>(null);

  useEffect(() => {
    if (!account) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFiles(null);
      return;
    }
    let cancelled = false;
    setFiles(null);
    apiFetch<AccountFile[]>(`/accounts/${account.id}/files`)
      .then((result) => {
        if (!cancelled) setFiles(result);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.show(err instanceof ApiError ? err.message : "Failed to load files", "error");
        onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id]);

  const groups = useMemo<Group[]>(() => {
    if (!files) return [];
    const byPath = new Map<string | null, AccountFile[]>();
    for (const f of files) {
      const key = f.folder_path;
      if (!byPath.has(key)) byPath.set(key, []);
      byPath.get(key)!.push(f);
    }
    const entries = [...byPath.entries()].sort(([a], [b]) => {
      if (a === null) return -1;
      if (b === null) return 1;
      return a.localeCompare(b);
    });
    return entries.map(([path, files]) => ({ path, files }));
  }, [files]);

  const totalSize = useMemo(() => (files ?? []).reduce((sum, f) => sum + f.size_bytes, 0), [files]);

  async function handleDownload(file: AccountFile) {
    try {
      const { blob, filename } = await apiDownload(`/files/${file.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Download failed", "error");
    }
  }

  let itemIndex = 0;

  return (
    <Modal
      open={account !== null}
      onClose={onClose}
      title={
        <span>
          Files on this account
          <div className="muted mono" style={{ fontSize: 12, fontWeight: 400, marginTop: 2 }}>
            {account?.email}
          </div>
        </span>
      }
    >
      {files === null ? (
        <div className="stack" style={{ gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
              style={{ height: 40, borderRadius: "var(--radius-sm)", background: "var(--void-2)" }}
            />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 8px", color: "var(--text-dim)" }}>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", opacity: 0.5 }}>
            <FileIcon size={26} />
          </div>
          Nothing stored here yet.
        </div>
      ) : (
        <div className="stack" style={{ gap: 18 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="muted mono"
            style={{ fontSize: 12 }}
          >
            {files.length} file{files.length === 1 ? "" : "s"} · {formatBytes(totalSize)} total
          </motion.div>

          {groups.map((group) => (
            <div key={group.path ?? "__root"} className="stack" style={{ gap: 6 }}>
              {group.path !== null && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(itemIndex, 12) * 0.035 }}
                  className="row muted"
                  style={{ gap: 6, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  <FolderIcon size={13} />
                  {group.path}
                </motion.div>
              )}
              {group.files.map((file) => {
                const delay = Math.min(itemIndex++, 14) * 0.035;
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ backgroundColor: "var(--void-2)" }}
                    className="row"
                    style={{
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      marginLeft: group.path !== null ? 18 : 0,
                    }}
                  >
                    <span className="row" style={{ minWidth: 0, gap: 8 }}>
                      <span style={{ color: "var(--text-faint)", flexShrink: 0 }}>
                        <FileIcon size={15} />
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13.5 }}>
                        {file.filename}
                      </span>
                    </span>
                    <span className="row" style={{ flexShrink: 0, gap: 10 }}>
                      <span className="muted mono" style={{ fontSize: 12 }}>
                        {formatBytes(file.size_bytes)}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.08, backgroundColor: "var(--void-3)" }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleDownload(file)}
                        aria-label={`Download ${file.filename}`}
                        className="secondary"
                        style={{ padding: 6, borderRadius: "50%", lineHeight: 0, border: "1px solid transparent", background: "transparent", color: "var(--text-dim)" }}
                      >
                        <DownloadIcon size={13} />
                      </motion.button>
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

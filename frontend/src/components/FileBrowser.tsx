"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { formatBytes, formatDateTime, hasFileExtension } from "@/lib/format";
import { FileIcon, ImageFileIcon, VideoFileIcon, DocFileIcon, DownloadIcon, TrashIcon, SearchIcon, EditIcon, MoveIcon, EyeOpenIcon, SortAscIcon, SortDescIcon } from "@/components/icons";
import RowMenu, { type MenuAction } from "@/components/RowMenu";
import { isPreviewable } from "@/components/FilePreviewModal";
import { useToast } from "@/components/Toast";
import type { OrbitFile } from "@/lib/types";

type SortKey = "filename" | "updated_at" | "size_bytes";

function categoryColor(mimeType: string | null): string {
  if (!mimeType) return "var(--text-faint)";
  if (mimeType.startsWith("image/")) return "var(--chart-1)";
  if (mimeType.startsWith("video/")) return "var(--chart-5)";
  if (mimeType.startsWith("application/pdf") || mimeType.startsWith("text/") || mimeType.startsWith("application/vnd") || mimeType.startsWith("application/msword")) {
    return "var(--chart-3)";
  }
  return "var(--chart-4)";
}

function CategoryIcon({ mimeType, size }: { mimeType: string | null; size: number }) {
  if (mimeType?.startsWith("image/")) return <ImageFileIcon size={size} />;
  if (mimeType?.startsWith("video/")) return <VideoFileIcon size={size} />;
  if (
    mimeType?.startsWith("application/pdf") ||
    mimeType?.startsWith("text/") ||
    mimeType?.startsWith("application/vnd") ||
    mimeType?.startsWith("application/msword")
  ) {
    return <DocFileIcon size={size} />;
  }
  return <FileIcon size={size} />;
}

function SortHeader({
  label,
  sortKey,
  className,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  className?: string;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th className={className} style={{ ...thStyle, cursor: "pointer", userSelect: "none" }} onClick={() => onSort(sortKey)}>
      <span className="row" style={{ gap: 4 }}>
        {label}
        {active && (
          <span style={{ display: "flex", color: "var(--gold)" }}>
            {sort.dir === "asc" ? <SortAscIcon size={11} /> : <SortDescIcon size={11} />}
          </span>
        )}
      </span>
    </th>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 11.5,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-faint)",
  background: "var(--void-2)",
};

export default function FileBrowser({
  files,
  onDownload,
  onDelete,
  onRename,
  onMove,
  onPreview,
  variant = "browse",
}: {
  files: OrbitFile[];
  onDownload: (file: OrbitFile) => void;
  onDelete: (file: OrbitFile) => void;
  onRename: (file: OrbitFile, newName: string) => Promise<void>;
  onMove: (file: OrbitFile) => void;
  onPreview: (file: OrbitFile) => void;
  variant?: "browse" | "search";
}) {
  const toast = useToast();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "filename", dir: "asc" });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  const sortedFiles = useMemo(() => {
    const arr = [...files];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sort.key === "filename") cmp = a.filename.localeCompare(b.filename);
      else if (sort.key === "updated_at") cmp = a.updated_at.localeCompare(b.updated_at);
      else cmp = a.size_bytes - b.size_bytes;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [files, sort]);

  function startRename(file: OrbitFile) {
    setRenamingId(file.id);
    setRenameValue(file.filename);
  }

  async function commitRename(file: OrbitFile) {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === file.filename) {
      setRenamingId(null);
      return;
    }
    if (!hasFileExtension(trimmed)) {
      toast.show('File names need an extension (like ".jpg" or ".pdf") — add one and try again.', "error");
      return;
    }
    setRenameBusy(true);
    try {
      await onRename(file, trimmed);
      setRenamingId(null);
    } catch {
      // caller already surfaced a toast — stay in edit mode so the user can retry
    } finally {
      setRenameBusy(false);
    }
  }

  if (files.length === 0) {
    // "browse" already has the real upload dropzone directly above it —
    // a second box here would visually duplicate that call-to-action
    // without actually being a drop target itself, which reads as a
    // second (broken) upload area. Nothing to say here that the
    // dropzone hasn't already said.
    if (variant === "browse") return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card"
        style={{ textAlign: "center", padding: "52px 24px", color: "var(--text-dim)" }}
      >
        <span
          style={{
            display: "inline-flex",
            width: 48,
            height: 48,
            borderRadius: 13,
            background: "var(--void-3)",
            color: "var(--text-faint)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <SearchIcon size={22} />
        </span>
        <div>No files match your search.</div>
      </motion.div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <SortHeader label="Name" sortKey="filename" sort={sort} onSort={toggleSort} />
              <SortHeader label="Modified" sortKey="updated_at" className="table-col-modified" sort={sort} onSort={toggleSort} />
              <SortHeader label="Size" sortKey="size_bytes" sort={sort} onSort={toggleSort} />
              <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedFiles.map((file, i) => {
              const isRenaming = renamingId === file.id;
              const actions: MenuAction[] = [];
              if (isPreviewable(file.mime_type)) {
                actions.push({ label: "Preview", icon: <EyeOpenIcon size={14} />, onClick: () => onPreview(file) });
              }
              actions.push({ label: "Rename", icon: <EditIcon size={14} />, onClick: () => startRename(file) });
              actions.push({ label: "Move to…", icon: <MoveIcon size={14} />, onClick: () => onMove(file) });
              actions.push({ label: "Delete", icon: <TrashIcon size={14} />, onClick: () => onDelete(file), danger: true });

              return (
                <motion.tr
                  key={file.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(i * 0.035, 0.4), ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ backgroundColor: "var(--void-2)" }}
                  style={{ borderBottom: i === sortedFiles.length - 1 ? "none" : "1px solid var(--border)" }}
                >
                  <td style={{ padding: "13px 16px", maxWidth: 320 }}>
                    <div className="row" style={{ gap: 12, minWidth: 0 }}>
                      <motion.span
                        whileHover={isPreviewable(file.mime_type) ? { scale: 1.1 } : undefined}
                        transition={{ duration: 0.15 }}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 9,
                          background: `color-mix(in srgb, ${categoryColor(file.mime_type)} 16%, transparent)`,
                          color: categoryColor(file.mime_type),
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: isPreviewable(file.mime_type) ? "pointer" : "default",
                        }}
                        onClick={() => isPreviewable(file.mime_type) && onPreview(file)}
                      >
                        <CategoryIcon mimeType={file.mime_type} size={15} />
                      </motion.span>
                      {isRenaming ? (
                        <span className="row" style={{ gap: 6, minWidth: 0, flex: 1 }}>
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renameValue}
                            disabled={renameBusy}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(file);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onBlur={() => commitRename(file)}
                            style={{ padding: "3px 8px", fontSize: 13.5, flex: 1, minWidth: 0 }}
                          />
                          {renameBusy && <span className="spinner" />}
                        </span>
                      ) : (
                        <span
                          onDoubleClick={() => startRename(file)}
                          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13.5 }}
                        >
                          {file.filename}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="muted mono table-col-modified" style={{ padding: "13px 16px", fontSize: 12.5, whiteSpace: "nowrap" }}>
                    {formatDateTime(file.updated_at)}
                  </td>
                  <td className="muted mono" style={{ padding: "13px 16px", fontSize: 12.5, whiteSpace: "nowrap" }}>
                    {formatBytes(file.size_bytes)}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right" }}>
                    <div className="row" style={{ justifyContent: "flex-end", gap: 2 }}>
                      <IconButton onClick={() => onDownload(file)} label="Download">
                        <DownloadIcon size={15} />
                      </IconButton>
                      <RowMenu actions={actions} />
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.08, backgroundColor: danger ? "rgba(208,59,59,0.14)" : "var(--void-3)" }}
      whileTap={{ scale: 0.94 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className="secondary"
      style={{
        padding: 7,
        borderRadius: "50%",
        lineHeight: 0,
        color: danger ? "var(--critical)" : "var(--text-dim)",
        border: "1px solid transparent",
        background: "transparent",
      }}
    >
      {children}
    </motion.button>
  );
}

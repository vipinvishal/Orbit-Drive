"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { FolderIcon, TrashIcon, EditIcon, MoveIcon } from "@/components/icons";
import RowMenu, { type MenuAction } from "@/components/RowMenu";
import { handleSpotlight } from "@/lib/spotlight";
import { formatDate } from "@/lib/format";
import type { Folder } from "@/lib/types";

const FOLDER_COLORS = [
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-1)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

// Deterministic, not random — the same folder always gets the same color
// across reloads and sessions, without storing anything server-side.
function colorForFolder(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return FOLDER_COLORS[hash % FOLDER_COLORS.length];
}

export default function FolderCardGrid({
  folders,
  onOpen,
  onDelete,
  onRename,
  onMove,
}: {
  folders: Folder[];
  onOpen: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onRename: (folder: Folder, newName: string) => Promise<void>;
  onMove: (folder: Folder) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  if (folders.length === 0) return null;

  function startRename(folder: Folder) {
    setRenamingId(folder.id);
    setRenameValue(folder.name);
  }

  async function commitRename(folder: Folder) {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === folder.name) {
      setRenamingId(null);
      return;
    }
    setRenameBusy(true);
    try {
      await onRename(folder, trimmed);
      setRenamingId(null);
    } catch {
      // caller already surfaced a toast — stay in edit mode so the user can retry
    } finally {
      setRenameBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
      {folders.map((folder, i) => {
        const color = colorForFolder(folder.id);
        const isRenaming = renamingId === folder.id;
        const actions: MenuAction[] = [
          { label: "Rename", icon: <EditIcon size={14} />, onClick: () => startRename(folder) },
          { label: "Move to…", icon: <MoveIcon size={14} />, onClick: () => onMove(folder) },
          { label: "Delete", icon: <TrashIcon size={14} />, onClick: () => onDelete(folder), danger: true },
        ];
        return (
          <motion.div
            key={folder.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, borderColor: "var(--border-bright)" }}
            onMouseMove={handleSpotlight}
            onClick={() => !isRenaming && onOpen(folder)}
            className="card spotlight-card"
            style={{ cursor: isRenaming ? "default" : "pointer" }}
          >
            <div className="between">
              <motion.span
                whileHover={{ scale: 1.1, rotate: -4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ color, display: "flex" }}
              >
                <FolderIcon size={30} />
              </motion.span>
              <RowMenu actions={actions} />
            </div>
            {isRenaming ? (
              <span className="row" style={{ gap: 6, marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  disabled={renameBusy}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(folder);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onBlur={() => commitRename(folder)}
                  style={{ padding: "4px 8px", fontSize: 13.5, flex: 1, minWidth: 0 }}
                />
                {renameBusy && <span className="spinner" />}
              </span>
            ) : (
              <div
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRename(folder);
                }}
                style={{ marginTop: 14, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {folder.name}
              </div>
            )}
            <div className="muted mono" style={{ fontSize: 11, marginTop: 3 }}>
              Created {formatDate(folder.created_at)}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

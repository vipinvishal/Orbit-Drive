"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UploadCloudIcon, FileIcon, CheckIcon, AlertTriangleIcon } from "@/components/icons";
import type { UploadTask } from "@/lib/types";

export default function UploadDropzone({
  onFiles,
  tasks,
}: {
  onFiles: (files: FileList) => void;
  tasks: UploadTask[];
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        animate={{
          borderColor: dragActive ? "var(--gold)" : "var(--border)",
          scale: dragActive ? 1.01 : 1,
        }}
        transition={{ duration: 0.18 }}
        className="card"
        style={{
          borderStyle: "dashed",
          borderWidth: 1.5,
          textAlign: "center",
          cursor: "pointer",
          padding: 30,
          position: "relative",
          overflow: "hidden",
          background: dragActive ? "var(--gold-wash)" : "var(--void-1)",
        }}
      >
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
        <div className="stack" style={{ alignItems: "center", gap: 8 }}>
          <motion.span
            animate={dragActive ? { y: -3 } : { y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: dragActive ? "var(--gold)" : "var(--text-faint)" }}
          >
            <UploadCloudIcon size={26} />
          </motion.span>
          <span style={{ fontSize: 14 }}>
            {dragActive ? (
              "Drop to upload"
            ) : (
              <>
                Drag and drop files here, or <span style={{ color: "var(--gold)", fontWeight: 600 }}>browse</span>
              </>
            )}
          </span>
        </div>
      </motion.div>

      <AnimatePresence>
        {tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div className="stack" style={{ gap: 6 }}>
              <AnimatePresence>
                {tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="card"
                    style={{ padding: "10px 14px" }}
                  >
                    <div className="row" style={{ gap: 10 }}>
                      <span
                        style={{
                          color: task.status === "error" ? "var(--critical)" : task.status === "done" ? "var(--good)" : "var(--text-faint)",
                          display: "flex",
                          flexShrink: 0,
                        }}
                      >
                        {task.status === "error" ? <AlertTriangleIcon size={15} /> : task.status === "done" ? <CheckIcon size={15} /> : <FileIcon size={15} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                        {task.name}
                      </span>
                      <span className="mono muted" style={{ fontSize: 11.5, flexShrink: 0 }}>
                        {task.status === "error" ? "Failed" : task.status === "done" ? "Done" : `${Math.round(task.progress * 100)}%`}
                      </span>
                    </div>
                    {task.status === "uploading" && (
                      <div style={{ height: 3, borderRadius: 2, background: "var(--void-3)", marginTop: 8, overflow: "hidden" }}>
                        <motion.div
                          animate={{ width: `${task.progress * 100}%` }}
                          transition={{ duration: 0.15 }}
                          style={{ height: "100%", background: "var(--gold)" }}
                        />
                      </div>
                    )}
                    {task.status === "error" && task.error && (
                      <div className="mono" style={{ fontSize: 11, color: "var(--critical)", marginTop: 6 }}>
                        {task.error}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

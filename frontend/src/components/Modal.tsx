"use client";

import { AnimatePresence, motion } from "motion/react";
import { CloseIcon } from "@/components/icons";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            background: "rgba(4, 5, 8, 0.7)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: "min(480px, 100%)", maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 0 }}
          >
            <div className="between" style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: 16, fontFamily: "var(--font-body)", fontWeight: 600 }}>{title}</h2>
              <button
                onClick={onClose}
                className="secondary"
                aria-label="Close"
                style={{ padding: 7, borderRadius: "50%", lineHeight: 0 }}
              >
                <CloseIcon size={13} />
              </button>
            </div>
            <div style={{ padding: 22, overflowY: "auto" }}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

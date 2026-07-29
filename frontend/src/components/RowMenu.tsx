"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MoreIcon } from "@/components/icons";

export type MenuAction = { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean };

// Shared kebab menu — file rows and folder cards both need Preview/Rename/
// Move/Download/Delete, and cramming five icon buttons into every row
// doesn't scale, so both funnel through this instead.
export default function RowMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }} onClick={(e) => e.stopPropagation()}>
      <motion.button
        whileHover={{ scale: 1.08, backgroundColor: "var(--void-3)" }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        className="secondary"
        style={{
          padding: 7,
          borderRadius: "50%",
          lineHeight: 0,
          border: "1px solid transparent",
          background: "transparent",
          color: "var(--text-dim)",
        }}
      >
        <MoreIcon size={15} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="card"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              zIndex: 60,
              padding: 6,
              minWidth: 168,
              boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
            }}
          >
            {actions.map((action, i) => (
              <motion.button
                key={i}
                whileHover={{ backgroundColor: "var(--void-2)" }}
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                className="row"
                style={{
                  gap: 9,
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  color: action.danger ? "var(--critical)" : "var(--text)",
                  fontWeight: 500,
                  fontSize: 13,
                  border: "none",
                  textAlign: "left",
                }}
              >
                {action.icon}
                {action.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

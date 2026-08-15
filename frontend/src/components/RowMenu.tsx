"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { MoreIcon } from "@/components/icons";

export type MenuAction = { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean };

type Position = { top?: number; bottom?: number; right: number };

// Rough estimate (container padding + ~34px per row) — good enough to
// decide whether the menu fits below the trigger or needs to flip above
// it; doesn't need to be pixel-perfect for that decision.
function estimateMenuHeight(actionCount: number): number {
  return 12 + actionCount * 34;
}

// Shared kebab menu — file rows and folder cards both need Preview/Rename/
// Move/Download/Delete, and cramming five icon buttons into every row
// doesn't scale, so both funnel through this instead.
//
// The dropdown is portaled to document.body and positioned with `fixed`
// coordinates computed from the trigger's own bounding rect, rather than
// `position: absolute` inside the row. FileBrowser's table sits inside an
// `overflow-x: auto` scroll wrapper inside an `overflow: hidden` card —
// any absolutely-positioned child of either gets visually clipped at that
// container's edge even though it's still "open" in the DOM. Escaping via
// portal is the standard fix for this class of bug.
export default function RowMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    // Scrolling (the page, or the table's own horizontal/vertical scroll)
    // invalidates the computed position instantly — closing is simpler and
    // less error-prone than tracking every possible scroll container.
    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedHeight = estimateMenuHeight(actions.length);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < estimatedHeight + 8 && rect.top > estimatedHeight;
      setPosition({
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  }

  return (
    <div style={{ position: "relative", display: "inline-flex" }} onClick={(e) => e.stopPropagation()}>
      <motion.button
        ref={triggerRef}
        whileHover={{ scale: 1.08, backgroundColor: "var(--void-3)" }}
        whileTap={{ scale: 0.94 }}
        onClick={handleToggle}
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
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && position && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: position.bottom !== undefined ? 6 : -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: position.bottom !== undefined ? 6 : -6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="card"
                style={{
                  position: "fixed",
                  top: position.top,
                  bottom: position.bottom,
                  right: position.right,
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
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type ToastKind = "success" | "error" | "info";
type ToastAction = { label: string; onClick: () => void };
type ToastOptions = { action?: ToastAction; duration?: number };
type Toast = { id: number; message: string; kind: ToastKind; action?: ToastAction };

const ToastContext = createContext<{ show: (message: string, kind?: ToastKind, options?: ToastOptions) => void } | null>(null);

const KIND_STYLE: Record<ToastKind, { border: string; icon: string }> = {
  success: { border: "var(--good)", icon: "✓" },
  error: { border: "var(--critical)", icon: "✕" },
  info: { border: "var(--gold)", icon: "●" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = "info", options?: ToastOptions) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, kind, action: options?.action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, options?.duration ?? 4200);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 84,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          width: "min(440px, calc(100vw - 32px))",
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => dismiss(t.id)}
              className="card"
              style={{
                borderLeft: `3px solid ${KIND_STYLE[t.kind].border}`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "13px 18px",
                width: "100%",
                boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
              }}
            >
              <span style={{ color: KIND_STYLE[t.kind].border, fontSize: 13, flexShrink: 0 }}>{KIND_STYLE[t.kind].icon}</span>
              <span style={{ fontSize: 14, flex: 1 }}>{t.message}</span>
              {t.action && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="secondary"
                  style={{ flexShrink: 0, padding: "5px 12px", fontSize: 13 }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import Sidebar from "@/components/Sidebar";
import AppBackground from "@/components/AppBackground";
import { MenuIcon } from "@/components/icons";

// Sidebar is one implementation used two ways: a sticky column on desktop
// (.sidebar-desktop, CSS-only, no JS) and an off-canvas drawer below 860px
// (.mobile-topbar hamburger + AnimatePresence slide-in) — see the
// `.app-shell` rules in globals.css for the breakpoint itself.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Closing on route change covers the Escape-less case: tapping a nav
  // link inside the drawer already calls onNavigate, but this catches any
  // other navigation (back/forward, breadcrumbs) too.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="secondary"
          style={{ padding: 8, borderRadius: "50%", lineHeight: 0 }}
        >
          <MenuIcon size={18} />
        </button>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>ORBIT DRIVE</span>
      </div>

      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="sidebar-backdrop"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="sidebar-drawer"
            >
              <Sidebar onNavigate={() => setDrawerOpen(false)} onClose={() => setDrawerOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="app-content">
        <AppBackground />
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

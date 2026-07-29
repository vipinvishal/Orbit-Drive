"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { API_BASE_URL } from "@/lib/api";

// Authenticated pages (/dashboard, /accounts) use Sidebar.tsx instead of
// this top nav — there's no page a logged-in user reaches where both would
// show at once, so this only ever needs the logged-out "Log in" state.
export default function Nav() {
  const pathname = usePathname();

  if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/accounts")) return null;

  function handleLogin() {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  }

  return (
    <nav
      style={{
        borderBottom: "1px solid var(--border)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(10px)",
        background: "rgba(7, 8, 13, 0.7)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        href="/"
        className="row"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text)", fontSize: 15 }}
      >
        <motion.span
          aria-hidden="true"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          style={{
            display: "inline-flex",
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: "1.5px solid var(--gold)",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "var(--gold)",
              top: -1.5,
              left: "50%",
              marginLeft: -2,
            }}
          />
        </motion.span>
        ORBIT DRIVE
      </Link>
      <div className="row">{pathname !== "/login" && <button onClick={handleLogin}>Log in</button>}</div>
    </nav>
  );
}

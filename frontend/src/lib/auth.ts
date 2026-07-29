"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TOKEN_KEY = "orbit_drive_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

/** Redirects to /login if there's no token. Returns null while the check
 * is in flight, so protected pages can avoid a flash of content. */
export function useRequireAuth(): string | null {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const existing = getToken();
    if (!existing) {
      router.replace("/login");
      return;
    }
    // Reading localStorage during render would mismatch the server-rendered
    // (window-less) pass, so this one-time sync has to happen in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokenState(existing);
  }, [router]);

  return token;
}

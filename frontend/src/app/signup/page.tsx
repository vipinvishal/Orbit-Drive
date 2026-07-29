"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Signing up and logging in are the same Google OAuth flow now — first time
// through creates the account, every time after just logs in.
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}

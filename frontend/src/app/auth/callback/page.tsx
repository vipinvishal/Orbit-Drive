"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { setToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      toast.show("Sign-in failed — no token received.", "error");
      router.replace("/login");
      return;
    }
    setToken(token);
    toast.show("Signed in. Your Google Drive is connected.", "success");
    router.replace("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="page"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}
    >
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        style={{
          display: "inline-flex",
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "2px solid var(--border)",
          borderTopColor: "var(--gold)",
        }}
      />
      <div className="muted">Signing you in…</div>
    </div>
  );
}

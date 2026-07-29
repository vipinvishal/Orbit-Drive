"use client";

import { useEffect, useState } from "react";
import { apiDownload, ApiError } from "@/lib/api";
import Modal from "@/components/Modal";
import { DownloadIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import type { OrbitFile } from "@/lib/types";

export function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/") || mimeType.startsWith("video/") || mimeType === "application/pdf";
}

export default function FilePreviewModal({
  file,
  onClose,
  onDownload,
}: {
  file: OrbitFile | null;
  onClose: () => void;
  onDownload: (file: OrbitFile) => void;
}) {
  const toast = useToast();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let url: string | null = null;
    apiDownload(`/files/${file.id}/download`)
      .then(({ blob }) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.show(err instanceof ApiError ? err.message : "Failed to load preview", "error");
        onClose();
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id]);

  return (
    <Modal open={file !== null} onClose={onClose} title={file?.filename ?? ""}>
      <div className="stack" style={{ alignItems: "center" }}>
        {objectUrl === null ? (
          <div className="muted row" style={{ padding: 32 }}>
            <span className="spinner" /> Loading preview…
          </div>
        ) : file?.mime_type?.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={objectUrl} alt={file.filename} style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: "var(--radius-sm)" }} />
        ) : file?.mime_type?.startsWith("video/") ? (
          <video src={objectUrl} controls style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: "var(--radius-sm)" }} />
        ) : (
          <iframe src={objectUrl} title={file?.filename} style={{ width: "100%", height: "60vh", border: "none", borderRadius: "var(--radius-sm)" }} />
        )}
        {file && (
          <button className="secondary row" style={{ gap: 8, marginTop: 4 }} onClick={() => onDownload(file)}>
            <DownloadIcon size={14} />
            Download
          </button>
        )}
      </div>
    </Modal>
  );
}

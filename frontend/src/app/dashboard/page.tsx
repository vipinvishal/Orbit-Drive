"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { apiFetch, apiDownload, apiUploadWithProgress, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import StorageSummary from "@/components/StorageSummary";
import ConnectFirstAccount from "@/components/ConnectFirstAccount";
import AddAccountNudge from "@/components/AddAccountNudge";
import SearchBar, { type SearchFilters } from "@/components/SearchBar";
import UploadDropzone from "@/components/UploadDropzone";
import FileBrowser from "@/components/FileBrowser";
import FolderCardGrid from "@/components/FolderCardGrid";
import NewFolderInline from "@/components/NewFolderInline";
import FolderPickerModal from "@/components/FolderPickerModal";
import FilePreviewModal from "@/components/FilePreviewModal";
import Modal from "@/components/Modal";
import AppShell from "@/components/AppShell";
import { OrbitBreakIcon, HomeIcon, ChevronRightIcon, FolderIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";
import type { FileListResponse, Folder, FolderTrashResponse, GoogleAccount, OrbitFile, StorageSummary as StorageSummaryType, UploadTask } from "@/lib/types";

type Breadcrumb = { id: string | null; name: string };
type PendingDelete = { files: OrbitFile[]; timeoutId: ReturnType<typeof setTimeout>; fromSearch: boolean };
type MoveTarget = { type: "file"; item: OrbitFile } | { type: "folder"; item: Folder };

const UNDO_WINDOW_MS = 5000;

export default function DashboardPage() {
  const token = useRequireAuth();
  const toast = useToast();

  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: "Home" }]);
  const [listing, setListing] = useState<FileListResponse | null>(null);
  const [summary, setSummary] = useState<StorageSummaryType | null>(null);
  const [accounts, setAccounts] = useState<GoogleAccount[] | null>(null);
  const [searchResults, setSearchResults] = useState<OrbitFile[] | null>(null);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [previewFile, setPreviewFile] = useState<OrbitFile | null>(null);

  const [folderDeleteTarget, setFolderDeleteTarget] = useState<Folder | null>(null);
  const [folderDeleteBusy, setFolderDeleteBusy] = useState(false);

  const pendingDeleteRef = useRef<PendingDelete | null>(null);
  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  const loadFolder = useCallback(
    async (folderId: string | null) => {
      try {
        setListing(await apiFetch<FileListResponse>("/files", { query: { folder_id: folderId ?? undefined } }));
      } catch (err) {
        toast.show(err instanceof ApiError ? err.message : "Failed to load files", "error");
      }
    },
    [toast],
  );

  const loadOverview = useCallback(async () => {
    try {
      const [summaryResult, accountsResult] = await Promise.all([
        apiFetch<StorageSummaryType>("/storage/summary"),
        apiFetch<GoogleAccount[]>("/accounts"),
      ]);
      setSummary(summaryResult);
      setAccounts(accountsResult);
    } catch {
      // non-critical widget — ignore failures here
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    // Data load triggered by auth resolving or folder navigation — not
    // mirroring external state, so the lint rule's steady-state concern
    // doesn't apply.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFolder(currentFolderId);
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentFolderId]);

  // If a delete is still sitting in its undo window when the user navigates
  // away entirely, commit it for real instead of silently dropping it —
  // the toast already told them it was deleted.
  useEffect(() => {
    return () => {
      const pending = pendingDeleteRef.current;
      if (!pending) return;
      clearTimeout(pending.timeoutId);
      for (const file of pending.files) {
        apiFetch(`/files/${file.id}`, { method: "DELETE" }).catch(() => {});
      }
    };
  }, []);

  function handleOpenFolder(folder: Folder) {
    setSearchResults(null);
    setBreadcrumbs((prev) => {
      // Guards against a double-click firing this twice in a row and
      // appending the same folder to the trail twice.
      if (prev[prev.length - 1]?.id === folder.id) return prev;
      return [...prev, { id: folder.id, name: folder.name }];
    });
  }

  function handleBreadcrumbClick(index: number) {
    setSearchResults(null);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }

  async function handleCreateFolder(name: string) {
    try {
      await apiFetch("/folders", { method: "POST", body: { name, parent_folder_id: currentFolderId } });
      toast.show(`"${name}" created.`, "success");
      await loadFolder(currentFolderId);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to create folder", "error");
      throw err;
    }
  }

  async function handleRenameFile(file: OrbitFile, newName: string) {
    try {
      const updated = await apiFetch<OrbitFile>(`/files/${file.id}`, { method: "PATCH", body: { filename: newName } });
      setListing((prev) => (prev ? { ...prev, files: prev.files.map((f) => (f.id === updated.id ? updated : f)) } : prev));
      setSearchResults((prev) => (prev ? prev.map((f) => (f.id === updated.id ? updated : f)) : prev));
      toast.show(`Renamed to "${updated.filename}".`, "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to rename", "error");
      throw err;
    }
  }

  async function handleRenameFolder(folder: Folder, newName: string) {
    try {
      const updated = await apiFetch<Folder>(`/folders/${folder.id}`, { method: "PATCH", body: { name: newName } });
      setListing((prev) => (prev ? { ...prev, folders: prev.folders.map((f) => (f.id === updated.id ? updated : f)) } : prev));
      toast.show(`Renamed to "${updated.name}".`, "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to rename", "error");
      throw err;
    }
  }

  async function confirmMove(targetFolderId: string | null) {
    if (!moveTarget) return;
    try {
      if (moveTarget.type === "file") {
        const updated = await apiFetch<OrbitFile>(`/files/${moveTarget.item.id}`, {
          method: "PATCH",
          body: { folder_id: targetFolderId },
        });
        if (!searchResults && targetFolderId !== currentFolderId) {
          setListing((prev) => (prev ? { ...prev, files: prev.files.filter((f) => f.id !== updated.id) } : prev));
        } else {
          setListing((prev) => (prev ? { ...prev, files: prev.files.map((f) => (f.id === updated.id ? updated : f)) } : prev));
          setSearchResults((prev) => (prev ? prev.map((f) => (f.id === updated.id ? updated : f)) : prev));
        }
        toast.show(`Moved "${updated.filename}".`, "success");
      } else {
        const updated = await apiFetch<Folder>(`/folders/${moveTarget.item.id}`, {
          method: "PATCH",
          body: { parent_folder_id: targetFolderId },
        });
        if (targetFolderId !== currentFolderId) {
          setListing((prev) => (prev ? { ...prev, folders: prev.folders.filter((f) => f.id !== updated.id) } : prev));
        }
        toast.show(`Moved "${updated.name}".`, "success");
      }
      await loadOverview();
      setMoveTarget(null);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to move", "error");
      throw err;
    }
  }

  // Trashing is reversible (see /trash), so this is one lightweight
  // confirm — no more "check if it's empty, then escalate to a scarier
  // warning" dance like the old hard-delete needed.
  function handleDeleteFolder(folder: Folder) {
    setFolderDeleteTarget(folder);
  }

  function closeFolderDeleteModal() {
    if (folderDeleteBusy) return;
    setFolderDeleteTarget(null);
  }

  async function confirmDeleteFolder() {
    if (!folderDeleteTarget) return;
    setFolderDeleteBusy(true);
    try {
      const result = await apiFetch<FolderTrashResponse>(`/folders/${folderDeleteTarget.id}`, { method: "DELETE" });
      const extra = result.files_trashed + result.folders_trashed - 1;
      toast.show(
        extra > 0 ? `"${folderDeleteTarget.name}" and ${extra} more item${extra === 1 ? "" : "s"} moved to Trash.` : `"${folderDeleteTarget.name}" moved to Trash.`,
        "success",
      );
      setFolderDeleteTarget(null);
      await loadFolder(currentFolderId);
      await loadOverview();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Failed to delete folder", "error");
    } finally {
      setFolderDeleteBusy(false);
    }
  }

  function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);
    const newTasks: UploadTask[] = files.map((f) => ({ id: crypto.randomUUID(), name: f.name, progress: 0, status: "uploading" }));
    setUploadTasks((prev) => [...prev, ...newTasks]);

    files.forEach((file, i) => {
      const taskId = newTasks[i].id;
      const formData = new FormData();
      formData.append("file", file);
      if (currentFolderId) formData.append("folder_id", currentFolderId);

      const { promise } = apiUploadWithProgress<OrbitFile>("/files/upload", formData, (fraction) => {
        setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress: fraction } : t)));
      });

      promise
        .then(() => {
          setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress: 1, status: "done" } : t)));
          loadFolder(currentFolderId);
          loadOverview();
          setTimeout(() => {
            setUploadTasks((prev) => prev.filter((t) => t.id !== taskId));
          }, 3000);
        })
        .catch((err) => {
          const message = err instanceof ApiError ? err.message : "Upload failed";
          setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "error", error: message } : t)));
          toast.show(`"${file.name}": ${message}`, "error");
        });
    });
  }

  async function handleDownload(file: OrbitFile) {
    try {
      const { blob, filename } = await apiDownload(`/files/${file.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Download failed", "error");
    }
  }

  function restoreDeletedFiles(files: OrbitFile[], fromSearch: boolean) {
    if (fromSearch) {
      setSearchResults((prev) => (prev ? [...prev, ...files] : prev));
    } else {
      setListing((prev) => (prev ? { ...prev, files: [...prev.files, ...files] } : prev));
    }
  }

  function deleteFiles(files: OrbitFile[]) {
    // Deleting here is real — it removes the file from Google Drive, not a
    // trash bin — so instead of a blocking confirm() dialog, the files
    // disappear immediately and the actual delete is held for a few
    // seconds behind an "Undo" toast. Works the same for one file or a
    // whole bulk selection, just with one toast instead of N.
    if (files.length === 0) return;
    const fromSearch = searchResults !== null;
    const ids = new Set(files.map((f) => f.id));

    if (fromSearch) {
      setSearchResults((prev) => prev?.filter((f) => !ids.has(f.id)) ?? null);
    } else {
      setListing((prev) => (prev ? { ...prev, files: prev.files.filter((f) => !ids.has(f.id)) } : prev));
    }

    const timeoutId = setTimeout(async () => {
      pendingDeleteRef.current = null;
      let failed = 0;
      for (const file of files) {
        try {
          await apiFetch(`/files/${file.id}`, { method: "DELETE" });
        } catch {
          failed++;
        }
      }
      await loadOverview();
      if (failed > 0) toast.show(`${failed} file${failed === 1 ? "" : "s"} couldn't be deleted.`, "error");
    }, UNDO_WINDOW_MS);

    pendingDeleteRef.current = { files, timeoutId, fromSearch };

    toast.show(`${files.length} file${files.length === 1 ? "" : "s"} deleted.`, "info", {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingDeleteRef.current;
          if (!pending) return;
          clearTimeout(pending.timeoutId);
          pendingDeleteRef.current = null;
          restoreDeletedFiles(pending.files, pending.fromSearch);
        },
      },
    });
  }

  function handleDelete(file: OrbitFile) {
    deleteFiles([file]);
  }

  async function handleSearch(query: string, filters: SearchFilters) {
    try {
      setSearchResults(
        await apiFetch<OrbitFile[]>("/files/search", {
          query: { q: query, category: filters.category || undefined, account_id: filters.accountId || undefined },
        }),
      );
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Search failed", "error");
    }
  }

  if (!token) return null;

  const currentFiles = searchResults ?? listing?.files ?? [];

  return (
    <AppShell>
      <div className="page stack" style={{ gap: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="row"
          style={{ gap: 14 }}
        >
          <span
            style={{
              display: "inline-flex",
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--gold-wash)",
              color: "var(--gold)",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FolderIcon size={20} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h1 style={{ fontSize: 28 }}>All Files</h1>
            <p className="muted" style={{ fontSize: 13.5 }}>
              Every connected Google account, browsed as one.
            </p>
          </div>
        </motion.div>

        {accounts !== null && accounts.length === 0 ? (
          <ConnectFirstAccount />
        ) : (
          <>
            {accounts !== null && accounts.length === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }}>
                <AddAccountNudge />
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
              <StorageSummary summary={summary} accounts={accounts} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <SearchBar accounts={accounts} onSearch={handleSearch} onClear={() => setSearchResults(null)} />
            </motion.div>

            {!searchResults && <UploadDropzone onFiles={handleFiles} tasks={uploadTasks} />}

        {searchResults ? (
          <div className="stack">
            <motion.div
              key={searchResults.length}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="muted"
            >
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
            </motion.div>
            <AnimatePresence>
              <FileBrowser
                files={currentFiles}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onRename={handleRenameFile}
                onMove={(file) => setMoveTarget({ type: "file", item: file })}
                onPreview={setPreviewFile}
                variant="search"
              />
            </AnimatePresence>
          </div>
        ) : (
          <>
            <div className="between" style={{ flexWrap: "wrap", gap: 12 }}>
              <div className="row" style={{ flexWrap: "wrap", fontSize: 14, gap: 6 }}>
                {breadcrumbs.map((crumb, i) => (
                  <span key={`${crumb.id ?? "root"}-${i}`} className="row" style={{ gap: 6 }}>
                    {i > 0 && (
                      <span className="muted" style={{ display: "flex" }}>
                        <ChevronRightIcon size={13} />
                      </span>
                    )}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleBreadcrumbClick(i);
                      }}
                      className="row"
                      style={{
                        gap: 5,
                        color: i === breadcrumbs.length - 1 ? "var(--text)" : "var(--gold)",
                        fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                      }}
                    >
                      {i === 0 && <HomeIcon size={14} />}
                      {crumb.name}
                    </a>
                  </span>
                ))}
              </div>
              <NewFolderInline onCreate={handleCreateFolder} />
            </div>

            {listing ? (
              <div className="stack" style={{ gap: 20 }}>
                <AnimatePresence>
                  <FolderCardGrid
                    folders={listing.folders}
                    onOpen={handleOpenFolder}
                    onDelete={handleDeleteFolder}
                    onRename={handleRenameFolder}
                    onMove={(folder) => setMoveTarget({ type: "folder", item: folder })}
                  />
                </AnimatePresence>
                <AnimatePresence>
                  <FileBrowser
                    files={currentFiles}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    onRename={handleRenameFile}
                    onMove={(file) => setMoveTarget({ type: "file", item: file })}
                    onPreview={setPreviewFile}
                  />
                </AnimatePresence>
              </div>
            ) : (
              <div className="stack" style={{ gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="card stack" style={{ gap: 14 }}>
                      <SkeletonBlock width={30} height={30} radius={9} />
                      <SkeletonLine width="70%" height={13} />
                    </div>
                  ))}
                </div>
                <div className="card" style={{ padding: 0 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="row"
                      style={{ padding: "13px 16px", gap: 12, borderBottom: i < 5 ? "1px solid var(--border)" : "none" }}
                    >
                      <SkeletonBlock width={30} height={30} radius={9} />
                      <SkeletonLine width={140 + i * 26} height={13} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
          </>
        )}

        <FolderPickerModal
          open={moveTarget !== null}
          title={`Move "${moveTarget?.type === "file" ? moveTarget.item.filename : moveTarget?.item.name ?? ""}"`}
          excludeFolderId={moveTarget?.type === "folder" ? moveTarget.item.id : undefined}
          onClose={() => setMoveTarget(null)}
          onConfirm={confirmMove}
        />

        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} onDownload={handleDownload} />

        <Modal
          open={folderDeleteTarget !== null}
          onClose={closeFolderDeleteModal}
          title={
            <span className="row" style={{ gap: 10 }}>
              <span style={{ color: "var(--critical)", display: "inline-flex" }}>
                <OrbitBreakIcon size={17} />
              </span>
              <span>
                Delete folder
                <div className="muted mono" style={{ fontSize: 12, fontWeight: 400, marginTop: 2 }}>
                  {folderDeleteTarget?.name}
                </div>
              </span>
            </span>
          }
        >
          <div className="stack">
            <p style={{ margin: 0 }}>
              Move &ldquo;{folderDeleteTarget?.name}&rdquo; to Trash? Everything inside it — every file, in every
              subfolder — goes too. You can restore it all from Trash within 30 days.
            </p>
            <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
              <button className="secondary" onClick={closeFolderDeleteModal} disabled={folderDeleteBusy}>
                Cancel
              </button>
              <button
                className="danger"
                style={{ border: "1px solid var(--critical)" }}
                disabled={folderDeleteBusy}
                onClick={confirmDeleteFolder}
              >
                {folderDeleteBusy ? (
                  <span className="row" style={{ justifyContent: "center" }}>
                    <span className="spinner" /> Moving…
                  </span>
                ) : (
                  "Move to Trash"
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}

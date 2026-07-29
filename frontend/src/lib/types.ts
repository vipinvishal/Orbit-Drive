export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type GoogleAccount = {
  id: string;
  google_email: string;
  status: "active" | "token_expired" | "error";
  total_quota_bytes: number | null;
  used_quota_bytes: number | null;
  last_quota_check_at: string | null;
  created_at: string;
};

export type Folder = {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
};

export type OrbitFile = {
  id: string;
  filename: string;
  folder_id: string | null;
  size_bytes: number;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
};

export type FileListResponse = {
  folders: Folder[];
  files: OrbitFile[];
};

export type AccountFile = OrbitFile & {
  folder_path: string | null;
};

export type StorageSummary = {
  total_quota_bytes: number;
  used_quota_bytes: number;
  remaining_bytes: number;
};

export type StorageBreakdown = {
  images_bytes: number;
  videos_bytes: number;
  documents_bytes: number;
  other_bytes: number;
};

export type UploadTask = {
  id: string;
  name: string;
  progress: number; // 0-1
  status: "uploading" | "done" | "error";
  error?: string;
};

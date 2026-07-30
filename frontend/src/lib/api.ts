import { getToken } from "./auth";

// Always relative — every backend call goes through this same origin's
// /api/* and gets proxied server-side by the Next.js rewrite in
// next.config.ts (to BACKEND_ORIGIN, a server-only env var). That means
// the browser never talks to the backend's own domain directly: no CORS,
// no second custom domain needed for the backend, and this constant never
// has to change between local dev and any deployment.
export const API_BASE_URL = "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
  query?: Record<string, string | undefined>;
};

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  let url = API_BASE_URL + path;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, value);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, auth = true, query } = options;

  const headers: Record<string, string> = {};
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let requestBody: BodyInit | undefined;
  if (formData) {
    requestBody = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, query), { method, headers, body: requestBody });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      // response body wasn't JSON — fall back to statusText
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return undefined as T;
}

// fetch() has no upload-progress event — XHR is the only way to get real
// per-file percentages instead of a single indeterminate bar for the whole
// batch, so uploads alone go through XHR while everything else uses fetch.
export function apiUploadWithProgress<T>(
  path: string,
  formData: FormData,
  onProgress: (fraction: number) => void,
): { promise: Promise<T>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<T>((resolve, reject) => {
    xhr.open("POST", buildUrl(path));
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : (undefined as T));
        } catch {
          resolve(undefined as T);
        }
        return;
      }
      let detail = xhr.statusText;
      try {
        detail = JSON.parse(xhr.responseText).detail || detail;
      } catch {
        // response body wasn't JSON — fall back to statusText
      }
      reject(new ApiError(xhr.status, detail));
    };

    xhr.onerror = () => reject(new ApiError(0, "Network error"));
    xhr.onabort = () => reject(new ApiError(0, "Upload cancelled"));
    xhr.send(formData);
  });

  return { promise, cancel: () => xhr.abort() };
}

export async function apiDownload(path: string): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(buildUrl(path), { headers });
  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }

  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : "download";

  return { blob: await response.blob(), filename };
}

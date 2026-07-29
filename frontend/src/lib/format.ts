export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// A dot that isn't the first or last character — "photo.jpg" yes,
// "photo." or ".jpg" or "photo" no. Mirrors the same check the backend
// enforces on PATCH /files/{id}, just run client-side first so a missing
// extension is rejected instantly instead of after a round trip.
export function hasFileExtension(filename: string): boolean {
  const idx = filename.lastIndexOf(".");
  return idx > 0 && idx < filename.length - 1;
}

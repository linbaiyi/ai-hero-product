export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

export function buildBackendFileUrl(imagePath: string): string {
  if (!imagePath) {
    return "";
  }

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  const normalizedPath = imagePath.replace(/^\/+/, "");
  return `${BACKEND_BASE_URL}/api/files/${encodeURI(normalizedPath)}`;
}

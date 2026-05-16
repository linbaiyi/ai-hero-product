import { BACKEND_BASE_URL } from "./backendApi";

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

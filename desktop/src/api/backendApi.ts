import type { BackendHealthResponse } from "../types/backend";

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

const BACKEND_CONNECTION_ERROR =
  "无法连接本地后端服务，请确认 FastAPI 后端已启动。";

export async function checkBackendHealth(): Promise<BackendHealthResponse> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/health`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(BACKEND_CONNECTION_ERROR);
    }

    return (await response.json()) as BackendHealthResponse;
  } catch {
    throw new Error(BACKEND_CONNECTION_ERROR);
  }
}

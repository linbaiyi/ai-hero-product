import type { BoardRenderRequest, BoardRenderResult } from "../types/project";

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

const CONNECTION_ERROR = "无法连接设计板渲染服务，请确认后端已启动。";
const GENERATION_ERROR = "技能特效设计板生成失败，请稍后重试。";
const FAILED_RESULT_ERROR = "技能特效设计板生成失败。";

class BoardRenderApiError extends Error {}

export async function renderVfxBoard(
  request: BoardRenderRequest,
): Promise<BoardRenderResult> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/boards/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new BoardRenderApiError(GENERATION_ERROR);
    }

    const result = (await response.json()) as BoardRenderResult;
    if (!result.success) {
      throw new BoardRenderApiError(result.error_message || FAILED_RESULT_ERROR);
    }

    return result;
  } catch (error) {
    if (error instanceof BoardRenderApiError) {
      throw error;
    }

    throw new Error(CONNECTION_ERROR);
  }
}

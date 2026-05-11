import type {
  ImagePromptBatchRequest,
  ImagePromptResult,
} from "../types/project";

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

const CONNECTION_ERROR = "无法连接图像 Prompt 生成服务，请确认后端已启动。";
const GENERATION_ERROR = "图像 Prompt 生成失败，请稍后重试。";

export async function generateImagePromptBatch(
  request: ImagePromptBatchRequest,
): Promise<ImagePromptResult[]> {
  try {
    const response = await fetch(
      `${BACKEND_BASE_URL}/api/image-prompts/generate-batch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      throw new Error(GENERATION_ERROR);
    }

    return (await response.json()) as ImagePromptResult[];
  } catch (error) {
    if (error instanceof Error && error.message === GENERATION_ERROR) {
      throw error;
    }

    throw new Error(CONNECTION_ERROR);
  }
}

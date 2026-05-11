import type {
  ImageGenerationBatchRequest,
  ImageGenerationRequest,
  ImageGenerationResult,
} from "../types/project";

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

const CONNECTION_ERROR = "无法连接图片生成服务，请确认后端已启动。";
const GENERATION_ERROR = "技能特效图片生成失败，请稍后重试。";

export async function generateImage(
  request: ImageGenerationRequest,
): Promise<ImageGenerationResult> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/images/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(GENERATION_ERROR);
    }

    return (await response.json()) as ImageGenerationResult;
  } catch (error) {
    if (error instanceof Error && error.message === GENERATION_ERROR) {
      throw error;
    }

    throw new Error(CONNECTION_ERROR);
  }
}

export async function generateImagesBatch(
  request: ImageGenerationBatchRequest,
): Promise<ImageGenerationResult[]> {
  try {
    const response = await fetch(
      `${BACKEND_BASE_URL}/api/images/generate-batch`,
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

    return (await response.json()) as ImageGenerationResult[];
  } catch (error) {
    if (error instanceof Error && error.message === GENERATION_ERROR) {
      throw error;
    }

    throw new Error(CONNECTION_ERROR);
  }
}

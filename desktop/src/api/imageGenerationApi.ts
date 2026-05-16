import type {
  ImageGenerationBatchRequest,
  ImageGenerationRequest,
  ImageGenerationResult,
} from "../types/project";
import { BACKEND_BASE_URL, readBackendErrorMessage } from "./backendApi";

const CONNECTION_ERROR = "无法连接图片生成服务，请确认后端已启动。";
const GENERATION_ERROR = "技能特效图片生成失败，请稍后重试。";

class ImageGenerationApiError extends Error {}

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
      throw new ImageGenerationApiError(
        await readBackendErrorMessage(response, GENERATION_ERROR),
      );
    }

    return (await response.json()) as ImageGenerationResult;
  } catch (error) {
    if (error instanceof ImageGenerationApiError) {
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
      throw new ImageGenerationApiError(
        await readBackendErrorMessage(response, GENERATION_ERROR),
      );
    }

    return (await response.json()) as ImageGenerationResult[];
  } catch (error) {
    if (error instanceof ImageGenerationApiError) {
      throw error;
    }

    throw new Error(CONNECTION_ERROR);
  }
}

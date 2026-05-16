import type { HeroDesign, HeroGenerateRequest } from "../types/project";
import { BACKEND_BASE_URL, readBackendErrorMessage } from "./backendApi";

const CONNECTION_ERROR = "无法连接英雄生成服务，请确认后端已启动。";
const GENERATION_ERROR = "英雄方案生成失败，请检查输入或稍后重试。";

export async function generateHeroDesign(
  request: HeroGenerateRequest,
): Promise<HeroDesign> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/api/hero/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error(CONNECTION_ERROR);
  }

  if (!response.ok) {
    throw new Error(await readBackendErrorMessage(response, GENERATION_ERROR));
  }

  return (await response.json()) as HeroDesign;
}

import type { HeroDesign, HeroGenerateRequest } from "../types/project";

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

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
    throw new Error(GENERATION_ERROR);
  }

  return (await response.json()) as HeroDesign;
}

import { normalizePlayableSpec } from "../game-demo/specs/normalizePlayableSpec";
import type { HeroPlayableSpec } from "../game-demo/specs/playableSpecTypes";
import { validatePlayableSpec } from "../game-demo/specs/playableSpecSchema";
import { BACKEND_BASE_URL } from "./backendApi";

const CONNECTION_ERROR =
  "无法连接试玩配置生成服务，请确认后端已启动。";
const GENERATION_ERROR =
  "试玩配置生成失败，请稍后重试。";
const VALIDATION_ERROR =
  "试玩配置校验失败，请重新生成。";

export type GeneratePlayableSpecRequest = {
  hero_design: unknown;
  style?: "3d_training_demo" | string;
  complexity?: "mvp" | string;
};

export type GeneratePlayableSpecResponse = {
  playable_spec: HeroPlayableSpec;
};

export type ValidatePlayableSpecRequest = {
  playable_spec: unknown;
};

export type ValidatePlayableSpecResponse = {
  valid: boolean;
  errors: string[];
};

export async function generatePlayableSpec(
  payload: GeneratePlayableSpecRequest,
): Promise<HeroPlayableSpec> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/api/playable/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        style: "3d_training_demo",
        complexity: "mvp",
        ...payload,
      }),
    });
  } catch {
    throw new Error(CONNECTION_ERROR);
  }

  if (!response.ok) {
    throw new Error(GENERATION_ERROR);
  }

  const data = (await response.json()) as { playable_spec?: unknown };
  try {
    return normalizePlayableSpec(data.playable_spec);
  } catch (error) {
    throw new Error(
      error instanceof Error ? `${VALIDATION_ERROR} ${error.message}` : VALIDATION_ERROR,
    );
  }
}

export async function validatePlayableSpecOnServer(
  payload: ValidatePlayableSpecRequest,
): Promise<ValidatePlayableSpecResponse> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/api/playable/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(CONNECTION_ERROR);
  }

  if (!response.ok) {
    throw new Error(VALIDATION_ERROR);
  }

  const data = (await response.json()) as ValidatePlayableSpecResponse;
  if (data.valid) {
    const localResult = validatePlayableSpec(payload.playable_spec);
    if (!localResult.success) {
      return { valid: false, errors: localResult.errors };
    }
  }

  return data;
}

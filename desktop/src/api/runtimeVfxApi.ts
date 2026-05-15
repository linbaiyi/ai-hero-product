import { normalizeRuntimeVfxAssetSpec } from "../game-demo/vfx-assets/normalizeRuntimeVfxAssetSpec";
import type { RuntimeVfxAssetSpec } from "../game-demo/vfx-assets/runtimeVfxTypes";
import type { HeroPlayableSpec } from "../game-demo/specs/playableSpecTypes";
import { BACKEND_BASE_URL } from "./backendApi";

const CONNECTION_ERROR =
  "无法连接运行时贴图资产生成服务，请确认后端已启动。";
const GENERATION_ERROR = "运行时贴图资产生成失败，请稍后重试。";
const VALIDATION_ERROR = "运行时贴图资产配置校验失败，请重新生成。";

export type GenerateRuntimeVfxAssetsRequest = {
  playable_spec: HeroPlayableSpec;
  runtime_vfx_asset_spec?: RuntimeVfxAssetSpec | null;
  max_textures?: number;
  image_size?: "256x256" | "512x512" | "768x768" | "1024x1024";
  transparent_background?: boolean;
  project_id?: string | null;
};

export type RuntimeVfxGeneratedAsset = {
  slot: "Q" | "W" | "E" | "R";
  skill_name: string;
  skill_type: string;
  usage: "projectile" | "impact" | "ground_decal" | "aura" | "trail";
  render_mode: string;
  path: string;
  prompt: string;
  width?: number | null;
  height?: number | null;
};

export type GenerateRuntimeVfxAssetsResponse = {
  runtime_vfx_asset_spec: RuntimeVfxAssetSpec;
  generated_assets: RuntimeVfxGeneratedAsset[];
  warnings: string[];
};

export async function generateRuntimeVfxAssets(
  payload: GenerateRuntimeVfxAssetsRequest,
): Promise<GenerateRuntimeVfxAssetsResponse> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/api/runtime-vfx/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runtime_vfx_asset_spec: null,
        max_textures: 20,
        image_size: "512x512",
        transparent_background: true,
        ...payload,
      }),
    });
  } catch {
    throw new Error(CONNECTION_ERROR);
  }

  if (!response.ok) {
    throw new Error(GENERATION_ERROR);
  }

  const data = (await response.json()) as {
    runtime_vfx_asset_spec?: unknown;
    generated_assets?: RuntimeVfxGeneratedAsset[];
    warnings?: string[];
  };

  try {
    return {
      runtime_vfx_asset_spec: normalizeRuntimeVfxAssetSpec(
        data.runtime_vfx_asset_spec,
      ),
      generated_assets: data.generated_assets ?? [],
      warnings: data.warnings ?? [],
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `${VALIDATION_ERROR} ${error.message}`
        : VALIDATION_ERROR,
    );
  }
}

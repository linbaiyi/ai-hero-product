import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRuntimeVfxAssets } from "../src/api/runtimeVfxApi";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";
import { defaultRuntimeVfxAssetSpec } from "../src/game-demo/vfx-assets/defaultRuntimeVfxAssetSpec";

afterEach(() => {
  vi.unstubAllGlobals();
});

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("runtimeVfxApi", () => {
  it("generateRuntimeVfxAssets calls the runtime vfx generate endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        runtime_vfx_asset_spec: defaultRuntimeVfxAssetSpec,
        generated_assets: [],
        warnings: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateRuntimeVfxAssets({
      playable_spec: defaultPlayableSpec,
      project_id: "desktop_123",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/runtime-vfx/generate"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("request body contains generation options", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        runtime_vfx_asset_spec: defaultRuntimeVfxAssetSpec,
        generated_assets: [],
        warnings: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateRuntimeVfxAssets({
      playable_spec: defaultPlayableSpec,
      vfx_designs: [
        {
          skill_name: "Test Skill",
          vfx_category: "fire projectile",
          visual_keywords: ["flame", "ember"],
          stages: [
            { stage: "cast", description: "red flame cast" },
            { stage: "flight", description: "red flame flight" },
            { stage: "impact", description: "red flame impact" },
            { stage: "fade", description: "red flame fade" },
          ],
          color_palette: { main: "#FF3B1F", secondary: "#FF8A2A" },
          camera_suggestion: "runtime sprite",
          sound_suggestion: "flame burst",
        },
      ],
      element_theme: "fire",
      max_textures: 6,
      image_size: "512x512",
      transparent_background: true,
      project_id: "desktop_123",
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      playable_spec: defaultPlayableSpec,
      vfx_designs: [
        expect.objectContaining({
          color_palette: { main: "#FF3B1F", secondary: "#FF8A2A" },
        }),
      ],
      element_theme: "fire",
      max_textures: 6,
      image_size: "512x512",
      transparent_background: true,
      project_id: "desktop_123",
    });
  });

  it("normalizes returned runtime_vfx_asset_spec", async () => {
    const reversed = {
      ...defaultRuntimeVfxAssetSpec,
      skills: {
        R: defaultRuntimeVfxAssetSpec.skills.R,
        W: defaultRuntimeVfxAssetSpec.skills.W,
        E: defaultRuntimeVfxAssetSpec.skills.E,
        Q: defaultRuntimeVfxAssetSpec.skills.Q,
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          runtime_vfx_asset_spec: reversed,
          generated_assets: [],
          warnings: [],
        }),
      ),
    );

    const result = await generateRuntimeVfxAssets({
      playable_spec: defaultPlayableSpec,
    });

    expect(Object.keys(result.runtime_vfx_asset_spec.skills)).toEqual([
      "Q",
      "W",
      "E",
      "R",
    ]);
  });

  it("throws when backend returns invalid spec", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          runtime_vfx_asset_spec: { version: "2.0" },
          generated_assets: [],
          warnings: [],
        }),
      ),
    );

    await expect(
      generateRuntimeVfxAssets({ playable_spec: defaultPlayableSpec }),
    ).rejects.toThrow("运行时贴图资产配置校验失败");
  });

  it("throws a clear error when request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(
      generateRuntimeVfxAssets({ playable_spec: defaultPlayableSpec }),
    ).rejects.toThrow("无法连接运行时贴图资产生成服务");
  });

  it("keeps warnings from backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          runtime_vfx_asset_spec: defaultRuntimeVfxAssetSpec,
          generated_assets: [],
          warnings: ["Skipped Q trail"],
        }),
      ),
    );

    const result = await generateRuntimeVfxAssets({
      playable_spec: defaultPlayableSpec,
    });

    expect(result.warnings).toEqual(["Skipped Q trail"]);
  });
});

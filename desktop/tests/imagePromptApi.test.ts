import { afterEach, describe, expect, it, vi } from "vitest";
import { generateImagePromptBatch } from "../src/api/imagePromptApi";
import type {
  ImagePromptBatchRequest,
  ImagePromptResult,
} from "../src/types/project";

const request: ImagePromptBatchRequest = {
  style_hint: "暗黑奇幻 game skill VFX thumbnail",
  vfx_designs: [
    {
      skill_name: "烈焰冲击",
      vfx_category: "AOE / Impact / Fire",
      visual_keywords: ["火焰", "余烬", "爆裂", "灼烧"],
      stages: [],
      color_palette: { main: "#FF5A1F" },
      camera_suggestion: "命中时加入轻微震屏。",
      sound_suggestion: "火焰喷涌声。",
      image_prompt: null,
    },
  ],
};

const results: ImagePromptResult[] = [
  {
    skill_name: "烈焰冲击",
    prompt:
      "A high-end game VFX concept art thumbnail, fire, ember, explosion, burning, dark background, no text, no logo, no watermark.",
    negative_prompt: "text, logo, watermark",
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateImagePromptBatch", () => {
  it("posts batch request to image prompt endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(results), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateImagePromptBatch(request);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/image-prompts/generate-batch"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      style_hint: "暗黑奇幻 game skill VFX thumbnail",
      vfx_designs: expect.any(Array),
    });
  });

  it("returns ImagePromptResult array when request succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(results), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(generateImagePromptBatch(request)).resolves.toEqual(results);
  });

  it("throws a Chinese error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(generateImagePromptBatch(request)).rejects.toThrow(
      "无法连接图像 Prompt 生成服务，请确认后端已启动。",
    );
  });

  it("throws a Chinese error when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad request", { status: 500 })),
    );

    await expect(generateImagePromptBatch(request)).rejects.toThrow(
      "图像 Prompt 生成失败，请稍后重试。",
    );
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { generateImage, generateImagesBatch } from "../src/api/imageGenerationApi";
import type {
  ImageGenerationBatchRequest,
  ImageGenerationRequest,
} from "../src/types/project";

const request: ImageGenerationBatchRequest = {
  project_id: "desktop_123",
  width: 512,
  height: 512,
  image_prompts: [
    {
      skill_name: "烈焰冲击",
      prompt: "fire ember explosion game VFX concept art, dark background",
      negative_prompt: "text, logo, watermark",
    },
  ],
};

const singleRequest: ImageGenerationRequest = {
  project_id: "desktop_123",
  width: 1024,
  height: 1024,
  image_prompt: request.image_prompts[0],
};

describe("generateImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to single image generation endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        skill_name: "鐑堢劙鍐插嚮",
        image_path: "outputs/images/desktop_123/skill_fire.png",
        file_name: "skill_fire.png",
        width: 1024,
        height: 1024,
        success: true,
        error_message: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateImage(singleRequest);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/images/generate"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({
      project_id: "desktop_123",
      width: 1024,
      height: 1024,
    });
    expect(body.image_prompt.skill_name).toBe(request.image_prompts[0].skill_name);
    expect(result.success).toBe(true);
  });
});

describe("generateImagesBatch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to image generation batch endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          skill_name: "烈焰冲击",
          image_path: "outputs/images/desktop_123/skill_fire.png",
          file_name: "skill_fire.png",
          width: 512,
          height: 512,
          success: true,
          error_message: null,
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateImagesBatch(request);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/images/generate-batch"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({
      project_id: "desktop_123",
      width: 512,
      height: 512,
    });
    expect(body.image_prompts[0].skill_name).toBe("烈焰冲击");
    expect(result[0].success).toBe(true);
  });

  it("throws Chinese connection error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(generateImagesBatch(request)).rejects.toThrow(
      "无法连接图片生成服务，请确认后端已启动。",
    );
  });

  it("throws Chinese generation error when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    await expect(generateImagesBatch(request)).rejects.toThrow(
      "技能特效图片生成失败，请稍后重试。",
    );
  });
});

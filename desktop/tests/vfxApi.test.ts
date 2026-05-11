import { afterEach, describe, expect, it, vi } from "vitest";
import { generateVfxBreakdownBatch } from "../src/api/vfxApi";
import type {
  VfxBreakdownBatchRequest,
  VfxDesign,
} from "../src/types/project";

const request: VfxBreakdownBatchRequest = {
  hero_name: "烬炎使",
  element_theme: "火焰",
  art_style: "暗黑奇幻",
  skills: [
    {
      slot: "一技能",
      name: "烈焰冲击",
      type: "AOE / 爆发",
      description: "释放火焰冲击。",
      mechanics: "命中后附加灼烧。",
      cooldown: "8秒",
      cost: "40法力",
      damage_type: "魔法伤害",
      balance_notes: "需要明显前摇。",
    },
  ],
};

const vfxDesigns: VfxDesign[] = [
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
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateVfxBreakdownBatch", () => {
  it("posts batch request to the VFX endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(vfxDesigns), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateVfxBreakdownBatch(request);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/vfx/breakdown-batch"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      hero_name: "烬炎使",
      element_theme: "火焰",
      art_style: "暗黑奇幻",
      skills: expect.any(Array),
    });
  });

  it("returns VfxDesign array when request succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(vfxDesigns), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(generateVfxBreakdownBatch(request)).resolves.toEqual(vfxDesigns);
  });

  it("throws a Chinese error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(generateVfxBreakdownBatch(request)).rejects.toThrow(
      "无法连接技能特效拆解服务，请确认后端已启动。",
    );
  });

  it("throws a Chinese error when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad request", { status: 500 })),
    );

    await expect(generateVfxBreakdownBatch(request)).rejects.toThrow(
      "技能特效拆解失败，请稍后重试。",
    );
  });
});

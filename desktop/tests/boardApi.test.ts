import { afterEach, describe, expect, it, vi } from "vitest";
import { renderVfxBoard } from "../src/api/boardApi";
import type { BoardRenderRequest } from "../src/types/project";

const request: BoardRenderRequest = {
  project_id: "desktop_123",
  hero_design: {
    hero_name: "烬焰使",
    hero_title: "灰烬王座的咒火者",
    role: "法师",
    difficulty: 4,
    core_tags: ["火焰"],
    background: "来自熔火遗迹的英雄。",
    combat_style: "范围爆发。",
    skills: [
      {
        slot: "一技能",
        name: "烈焰冲击",
        type: "主动",
        description: "火焰冲击。",
        mechanics: "灼烧。",
        cooldown: "8秒",
        cost: "40法力",
        damage_type: "魔法伤害",
        balance_notes: "有前摇。",
      },
    ],
    combo_logic: "先灼烧再引爆。",
    counterplay: "躲避前摇。",
    balance_summary: "爆发高。",
  },
  vfx_designs: [
    {
      skill_name: "烈焰冲击",
      vfx_category: "AOE / Impact / Fire",
      visual_keywords: ["火焰"],
      stages: [
        { stage: "施法前摇", description: "聚火。" },
        { stage: "技能主体", description: "冲击。" },
        { stage: "飞行轨迹", description: "轨迹。" },
        { stage: "命中反馈", description: "爆裂。" },
      ],
      color_palette: { main: "#FF5A1F" },
      camera_suggestion: "轻微震屏。",
      sound_suggestion: "火焰声。",
      image_prompt: null,
    },
  ],
  image_results: [
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
  width: 1600,
  height: 2400,
};

describe("renderVfxBoard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to board render endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        project_id: "desktop_123",
        board_path: "outputs/boards/desktop_123/vfx_board.png",
        file_name: "vfx_board.png",
        width: 1600,
        height: 2400,
        success: true,
        error_message: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await renderVfxBoard(request);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/boards/render"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.project_id).toBe("desktop_123");
    expect(body.hero_design.hero_name).toBe("烬焰使");
    expect(body.vfx_designs).toHaveLength(1);
    expect(body.image_results).toHaveLength(1);
    expect(body.width).toBe(1600);
    expect(body.height).toBe(2400);
    expect(result.success).toBe(true);
  });

  it("throws Chinese connection error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(renderVfxBoard(request)).rejects.toThrow(
      "无法连接设计板渲染服务，请确认后端已启动。",
    );
  });

  it("throws Chinese generation error when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    await expect(renderVfxBoard(request)).rejects.toThrow(
      "技能特效设计板生成失败，请稍后重试。",
    );
  });

  it("throws backend error message when response success is false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          project_id: "desktop_123",
          board_path: "outputs/boards/desktop_123/vfx_board.png",
          file_name: "vfx_board.png",
          width: 1600,
          height: 2400,
          success: false,
          error_message: "renderer crashed",
        }),
      }),
    );

    await expect(renderVfxBoard(request)).rejects.toThrow("renderer crashed");
  });
});

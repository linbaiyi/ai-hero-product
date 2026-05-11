import { afterEach, describe, expect, it, vi } from "vitest";
import { generateHeroDesign } from "../src/api/heroApi";
import type { HeroDesign, HeroGenerateRequest } from "../src/types/project";

const request: HeroGenerateRequest = {
  game_type: "MOBA",
  hero_role: "法师",
  element_theme: "火焰",
  art_style: "暗黑奇幻",
  core_gameplay: "范围爆发、持续灼烧、召唤火元素",
  skill_count: 5,
  generate_images: true,
  generate_board: true,
};

const hero: HeroDesign = {
  hero_name: "烬炎使",
  hero_title: "灰烬王座的咏火者",
  role: "法师",
  difficulty: 4,
  core_tags: ["火焰", "范围爆发"],
  background: "来自熔火遗迹的英雄。",
  combat_style: "依靠范围爆发和持续灼烧压制战场。",
  skills: [],
  combo_logic: "先叠加灼烧，再用终极技能引爆。",
  counterplay: "拉开距离并躲避前摇。",
  balance_summary: "爆发高但机动性弱。",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateHeroDesign", () => {
  it("posts hero request to the generate endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(hero), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateHeroDesign(request);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/hero/generate"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      game_type: "MOBA",
      hero_role: "法师",
      element_theme: "火焰",
      core_gameplay: "范围爆发、持续灼烧、召唤火元素",
      skill_count: 5,
    });
  });

  it("returns HeroDesign when request succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(hero), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(generateHeroDesign(request)).resolves.toEqual(hero);
  });

  it("throws a Chinese error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(generateHeroDesign(request)).rejects.toThrow(
      "无法连接英雄生成服务，请确认后端已启动。",
    );
  });

  it("throws a Chinese error when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad request", { status: 422 })),
    );

    await expect(generateHeroDesign(request)).rejects.toThrow(
      "英雄方案生成失败，请检查输入或稍后重试。",
    );
  });
});

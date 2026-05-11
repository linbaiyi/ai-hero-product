import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HeroResultPanel from "../src/components/HeroResultPanel";
import type { HeroDesign } from "../src/types/project";

const hero: HeroDesign = {
  hero_name: "烬炎使",
  hero_title: "灰烬王座的咏火者",
  role: "法师",
  difficulty: 4,
  core_tags: ["火焰", "范围爆发"],
  background: "来自熔火遗迹的英雄。",
  combat_style: "依靠范围爆发和持续灼烧压制战场。",
  skills: [
    {
      slot: "被动",
      name: "余烬印记",
      type: "被动",
      description: "技能命中后附加灼烧印记。",
      mechanics: "印记叠满后造成额外魔法伤害。",
      cooldown: "无",
      cost: "无",
      damage_type: "魔法伤害",
      balance_notes: "需要连续命中才能打满收益。",
    },
  ],
  combo_logic: "先叠加灼烧，再用终极技能引爆。",
  counterplay: "拉开距离并躲避前摇。",
  balance_summary: "爆发高但机动性弱。",
};

describe("HeroResultPanel", () => {
  it("renders placeholder when hero is null", () => {
    render(<HeroResultPanel hero={null} />);

    expect(screen.getByText("英雄技能方案区")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<HeroResultPanel hero={null} isLoading />);

    expect(screen.getByText("正在生成英雄技能方案...")).toBeInTheDocument();
  });

  it("renders full hero design", () => {
    render(<HeroResultPanel hero={hero} />);

    expect(screen.getByText("烬炎使")).toBeInTheDocument();
    expect(screen.getByText("灰烬王座的咏火者")).toBeInTheDocument();
    expect(screen.getByText("火焰")).toBeInTheDocument();
    expect(screen.getByText("来自熔火遗迹的英雄。")).toBeInTheDocument();
    expect(screen.getByText("余烬印记")).toBeInTheDocument();
    expect(screen.getByText("先叠加灼烧，再用终极技能引爆。")).toBeInTheDocument();
    expect(screen.getByText("拉开距离并躲避前摇。")).toBeInTheDocument();
    expect(screen.getByText("爆发高但机动性弱。")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SkillCard from "../src/components/SkillCard";
import type { SkillDesign } from "../src/types/project";

const skill: SkillDesign = {
  slot: "一技能",
  name: "烈焰冲击",
  type: "主动",
  description: "释放一道火焰冲击波。",
  mechanics: "命中后造成范围伤害并附加灼烧。",
  cooldown: "8 秒",
  cost: "40 法力",
  damage_type: "魔法伤害",
  balance_notes: "范围较大但前摇明显。",
};

describe("SkillCard", () => {
  it("renders all skill fields", () => {
    render(<SkillCard skill={skill} />);

    expect(screen.getByText("一技能")).toBeInTheDocument();
    expect(screen.getByText("烈焰冲击")).toBeInTheDocument();
    expect(screen.getByText("主动")).toBeInTheDocument();
    expect(screen.getByText("释放一道火焰冲击波。")).toBeInTheDocument();
    expect(screen.getByText("命中后造成范围伤害并附加灼烧。")).toBeInTheDocument();
    expect(screen.getByText("8 秒")).toBeInTheDocument();
    expect(screen.getByText("40 法力")).toBeInTheDocument();
    expect(screen.getByText("魔法伤害")).toBeInTheDocument();
    expect(screen.getByText("范围较大但前摇明显。")).toBeInTheDocument();
  });
});

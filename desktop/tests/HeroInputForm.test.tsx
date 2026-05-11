import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HeroInputForm from "../src/components/HeroInputForm";

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText("游戏类型"), {
    target: { value: "MOBA" },
  });
  fireEvent.change(screen.getByLabelText("英雄定位"), {
    target: { value: "法师" },
  });
  fireEvent.change(screen.getByLabelText("元素主题"), {
    target: { value: "火焰" },
  });
  fireEvent.change(screen.getByLabelText("美术风格"), {
    target: { value: "暗黑奇幻" },
  });
  fireEvent.change(screen.getByLabelText("核心玩法"), {
    target: { value: "范围爆发、持续灼烧、召唤火元素、适合团战压制" },
  });
  fireEvent.change(screen.getByLabelText("技能数量"), {
    target: { value: "5" },
  });
};

describe("HeroInputForm", () => {
  it("renders all form fields and the submit button", () => {
    render(<HeroInputForm onSubmit={vi.fn()} />);

    expect(screen.getByText("英雄需求输入区")).toBeInTheDocument();
    expect(screen.getByLabelText("游戏类型")).toBeInTheDocument();
    expect(screen.getByLabelText("英雄定位")).toBeInTheDocument();
    expect(screen.getByLabelText("元素主题")).toBeInTheDocument();
    expect(screen.getByLabelText("美术风格")).toBeInTheDocument();
    expect(screen.getByLabelText("核心玩法")).toBeInTheDocument();
    expect(screen.getByLabelText("技能数量")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "生成英雄方案" }),
    ).toBeInTheDocument();
  });

  it("calls onSubmit with the complete hero generate request", () => {
    const onSubmit = vi.fn();
    render(<HeroInputForm onSubmit={onSubmit} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "生成英雄方案" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      game_type: "MOBA",
      hero_role: "法师",
      element_theme: "火焰",
      art_style: "暗黑奇幻",
      core_gameplay: "范围爆发、持续灼烧、召唤火元素、适合团战压制",
      skill_count: 5,
      generate_images: true,
      generate_board: true,
    });
  });

  it("does not submit and shows an error when core gameplay is empty", () => {
    const onSubmit = vi.fn();
    render(<HeroInputForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("游戏类型"), {
      target: { value: "MOBA" },
    });
    fireEvent.change(screen.getByLabelText("英雄定位"), {
      target: { value: "法师" },
    });
    fireEvent.change(screen.getByLabelText("元素主题"), {
      target: { value: "火焰" },
    });
    fireEvent.change(screen.getByLabelText("美术风格"), {
      target: { value: "暗黑奇幻" },
    });

    fireEvent.click(screen.getByRole("button", { name: "生成英雄方案" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("请填写核心玩法")).toBeInTheDocument();
  });

  it("disables submit button while submitting", () => {
    render(<HeroInputForm onSubmit={vi.fn()} isSubmitting />);

    const button = screen.getByRole("button", { name: "生成中..." });
    expect(button).toBeDisabled();
  });
});

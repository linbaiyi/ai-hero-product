import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ImagePromptPanel from "../src/components/ImagePromptPanel";

const imagePrompts = [
  {
    skill_name: "烈焰冲击",
    prompt:
      "A high-end game VFX concept art thumbnail, fire, ember, dark background, no text, no logo, no watermark.",
    negative_prompt: "text, logo, watermark",
  },
];

describe("ImagePromptPanel", () => {
  it("renders empty state", () => {
    render(<ImagePromptPanel imagePrompts={[]} />);

    expect(screen.getByText("暂无图像 Prompt")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<ImagePromptPanel imagePrompts={[]} isLoading />);

    expect(screen.getByText("正在生成全部技能图像 Prompt...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <ImagePromptPanel
        imagePrompts={[]}
        errorMessage="图像 Prompt 生成失败，请稍后重试。"
      />,
    );

    expect(screen.getByText("图像 Prompt 生成失败")).toBeInTheDocument();
  });

  it("renders prompt list", () => {
    render(<ImagePromptPanel imagePrompts={imagePrompts} />);

    expect(screen.getByText("图像 Prompt 列表")).toBeInTheDocument();
    expect(screen.getByText(imagePrompts[0].prompt)).toBeInTheDocument();
  });
});

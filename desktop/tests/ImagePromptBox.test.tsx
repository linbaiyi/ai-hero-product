import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImagePromptBox from "../src/components/ImagePromptBox";

const imagePrompt = {
  skill_name: "烈焰冲击",
  prompt:
    "A high-end game VFX concept art thumbnail, fire, ember, dark background, no text, no logo, no watermark.",
  negative_prompt: "text, logo, watermark, low quality",
};

describe("ImagePromptBox", () => {
  it("renders empty state", () => {
    render(<ImagePromptBox imagePrompt={null} />);

    expect(screen.getByText("暂无图像 Prompt")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<ImagePromptBox imagePrompt={null} isLoading />);

    expect(screen.getByText("正在生成图像 Prompt...")).toBeInTheDocument();
  });

  it("renders error state and retry button", () => {
    const onRetry = vi.fn();
    render(
      <ImagePromptBox
        imagePrompt={null}
        errorMessage="图像 Prompt 生成失败，请稍后重试。"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("图像 Prompt 生成失败")).toBeInTheDocument();
    expect(screen.getByText("图像 Prompt 生成失败，请稍后重试。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新生成 Prompt" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders prompt content", () => {
    render(<ImagePromptBox imagePrompt={imagePrompt} />);

    expect(screen.getByText("图像生成 Prompt")).toBeInTheDocument();
    expect(screen.getByText("烈焰冲击")).toBeInTheDocument();
    expect(screen.getByText(imagePrompt.prompt)).toBeInTheDocument();
    expect(screen.getByText("反向 Prompt")).toBeInTheDocument();
    expect(screen.getByText(imagePrompt.negative_prompt)).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VfxImagePreview from "../src/components/VfxImagePreview";
import type { ImageGenerationResult } from "../src/types/project";

const imageResult: ImageGenerationResult = {
  skill_name: "烈焰冲击",
  image_path: "outputs/images/desktop_123/skill_烈焰冲击.png",
  file_name: "skill_烈焰冲击.png",
  width: 512,
  height: 512,
  success: true,
  error_message: null,
};

describe("VfxImagePreview", () => {
  it("renders empty state", () => {
    render(<VfxImagePreview />);

    expect(screen.getByText("暂无技能特效图")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<VfxImagePreview isLoading />);

    expect(screen.getByText("正在生成技能特效图...")).toBeInTheDocument();
  });

  it("renders error state with retry", () => {
    const onRetry = vi.fn();
    render(
      <VfxImagePreview
        errorMessage="技能特效图片生成失败，请稍后重试。"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("技能特效图生成失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新生成图片" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders successful image result", () => {
    render(<VfxImagePreview imageResult={imageResult} />);

    const image = screen.getByRole("img", { name: "烈焰冲击 技能特效预览图" });
    expect(screen.getByText("技能特效预览图")).toBeInTheDocument();
    expect(image).toHaveAttribute(
      "src",
      "http://127.0.0.1:8001/api/files/outputs/images/desktop_123/skill_%E7%83%88%E7%84%B0%E5%86%B2%E5%87%BB.png",
    );
    expect(screen.getByText("skill_烈焰冲击.png")).toBeInTheDocument();
    expect(screen.getByText("512×512")).toBeInTheDocument();
  });

  it("renders failed image result", () => {
    render(
      <VfxImagePreview
        imageResult={{
          ...imageResult,
          success: false,
          error_message: "fake image failed",
        }}
      />,
    );

    expect(screen.getByText("该技能图片生成失败")).toBeInTheDocument();
    expect(screen.getByText("fake image failed")).toBeInTheDocument();
  });
});

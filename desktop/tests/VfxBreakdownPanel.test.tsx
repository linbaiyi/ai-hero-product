import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VfxBreakdownPanel from "../src/components/VfxBreakdownPanel";
import type {
  BoardRenderResult,
  ImageGenerationResult,
  ImagePromptResult,
  VfxDesign,
} from "../src/types/project";

const vfxDesigns: VfxDesign[] = [
  {
    skill_name: "烈焰冲击",
    vfx_category: "AOE / Impact / Fire",
    visual_keywords: ["火焰", "余烬"],
    stages: [
      {
        stage: "施法前摇",
        description: "角色手中聚集橙红色火焰。",
      },
    ],
    color_palette: { main: "#FF5A1F" },
    camera_suggestion: "命中时加入轻微震屏。",
    sound_suggestion: "火焰喷涌声。",
    image_prompt: null,
  },
];

const imagePrompts: ImagePromptResult[] = [
  {
    skill_name: "烈焰冲击",
    prompt:
      "A high-end game VFX concept art thumbnail of fire and ember, dark background, no text, no logo, no watermark.",
    negative_prompt: "text, logo, watermark",
  },
];

const imageResults: ImageGenerationResult[] = [
  {
    skill_name: "烈焰冲击",
    image_path: "outputs/images/desktop_123/skill_fire.png",
    file_name: "skill_fire.png",
    width: 512,
    height: 512,
    success: true,
    error_message: null,
  },
];

const boardResult: BoardRenderResult = {
  project_id: "desktop_123",
  board_path: "outputs/boards/desktop_123/vfx_board.png",
  file_name: "vfx_board.png",
  width: 1600,
  height: 2400,
  success: true,
  error_message: null,
};

describe("VfxBreakdownPanel", () => {
  it("renders placeholder state", () => {
    render(<VfxBreakdownPanel vfxDesigns={[]} />);

    expect(screen.getByText("技能特效设计板区")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<VfxBreakdownPanel vfxDesigns={[]} isLoading />);

    expect(screen.getByText("正在拆解技能特效...")).toBeInTheDocument();
  });

  it("renders error state with retry", () => {
    const onRetry = vi.fn();
    render(
      <VfxBreakdownPanel
        vfxDesigns={[]}
        errorMessage="技能特效拆解失败，请稍后重试。"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("特效拆解失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新拆解" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders VFX cards when data exists", () => {
    render(<VfxBreakdownPanel vfxDesigns={vfxDesigns} />);

    expect(screen.getByText("技能特效拆解方案")).toBeInTheDocument();
    expect(screen.getByText("烈焰冲击")).toBeInTheDocument();
  });

  it("renders matched image prompts inside VFX cards", () => {
    render(
      <VfxBreakdownPanel
        vfxDesigns={vfxDesigns}
        imagePrompts={imagePrompts}
      />,
    );

    expect(screen.getByText(imagePrompts[0].prompt)).toBeInTheDocument();
  });

  it("renders image prompt error and retries", () => {
    const onRetryImagePrompt = vi.fn();
    render(
      <VfxBreakdownPanel
        vfxDesigns={vfxDesigns}
        imagePromptError="图像 Prompt 生成失败，请稍后重试。"
        onRetryImagePrompt={onRetryImagePrompt}
      />,
    );

    expect(screen.getByText("图像 Prompt 生成失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新生成 Prompt" }));
    expect(onRetryImagePrompt).toHaveBeenCalledTimes(1);
  });

  it("renders matched generated images inside VFX cards", () => {
    render(
      <VfxBreakdownPanel
        vfxDesigns={vfxDesigns}
        imageResults={imageResults}
      />,
    );

    expect(screen.getByText("技能特效预览图")).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders image generation error and retries", () => {
    const onRetryImages = vi.fn();
    render(
      <VfxBreakdownPanel
        vfxDesigns={vfxDesigns}
        imageGenerateError="技能特效图片生成失败，请稍后重试。"
        onRetryImages={onRetryImages}
      />,
    );

    expect(screen.getByText("技能特效图片生成失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新生成图片" }));
    expect(onRetryImages).toHaveBeenCalledTimes(1);
  });

  it("renders board preview when board result exists", () => {
    render(
      <VfxBreakdownPanel
        vfxDesigns={vfxDesigns}
        boardResult={boardResult}
      />,
    );

    expect(screen.getByText("最终技能特效设计板")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "最终技能特效设计板" })).toBeInTheDocument();
    expect(screen.getByText("烈焰冲击")).toBeInTheDocument();
  });

  it("renders board loading state", () => {
    render(<VfxBreakdownPanel vfxDesigns={vfxDesigns} isBoardRendering />);

    expect(screen.getByText("正在生成技能特效设计板...")).toBeInTheDocument();
  });

  it("renders board error and retries", () => {
    const onRetryBoard = vi.fn();
    render(
      <VfxBreakdownPanel
        vfxDesigns={vfxDesigns}
        boardRenderError="技能特效设计板生成失败，请稍后重试。"
        onRetryBoard={onRetryBoard}
      />,
    );

    expect(screen.getByText("技能特效设计板生成失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新生成设计板" }));
    expect(onRetryBoard).toHaveBeenCalledTimes(1);
  });
});

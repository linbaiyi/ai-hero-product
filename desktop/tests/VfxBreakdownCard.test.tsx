import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VfxBreakdownCard from "../src/components/VfxBreakdownCard";
import type {
  ImageGenerationResult,
  ImagePromptResult,
  VfxDesign,
} from "../src/types/project";

const vfx: VfxDesign = {
  skill_name: "烈焰冲击",
  vfx_category: "AOE / Impact / Fire",
  visual_keywords: ["火焰", "余烬", "爆裂", "灼烧"],
  stages: [
    {
      stage: "施法前摇",
      description: "角色手中聚集橙红色火焰。",
    },
  ],
  color_palette: {
    main: "#FF5A1F",
    secondary: "#FFC15A",
  },
  camera_suggestion: "命中时加入轻微震屏。",
  sound_suggestion: "火焰喷涌声。",
  image_prompt: null,
};

const imagePrompt: ImagePromptResult = {
  skill_name: "烈焰冲击",
  prompt:
    "A high-end game VFX concept art thumbnail of fire impact, dark background, no text, no logo, no watermark.",
  negative_prompt: "text, logo, watermark",
};

const imageResult: ImageGenerationResult = {
  skill_name: "烈焰冲击",
  image_path: "outputs/images/desktop_123/skill_fire.png",
  file_name: "skill_fire.png",
  width: 512,
  height: 512,
  success: true,
  error_message: null,
};

describe("VfxBreakdownCard", () => {
  it("renders VFX design details", () => {
    render(<VfxBreakdownCard vfx={vfx} />);

    expect(screen.getByText("烈焰冲击")).toBeInTheDocument();
    expect(screen.getByText("AOE / Impact / Fire")).toBeInTheDocument();
    expect(screen.getByText("火焰")).toBeInTheDocument();
    expect(screen.getByText("施法前摇")).toBeInTheDocument();
    expect(screen.getByText("#FF5A1F")).toBeInTheDocument();
    expect(screen.getByText("命中时加入轻微震屏。")).toBeInTheDocument();
    expect(screen.getByText("火焰喷涌声。")).toBeInTheDocument();
  });

  it("renders the matched image prompt", () => {
    render(<VfxBreakdownCard imagePrompt={imagePrompt} vfx={vfx} />);

    expect(screen.getByText("图像生成 Prompt")).toBeInTheDocument();
    expect(screen.getByText(imagePrompt.prompt)).toBeInTheDocument();
  });

  it("renders image prompt loading state", () => {
    render(<VfxBreakdownCard isImagePromptLoading vfx={vfx} />);

    expect(screen.getByText("正在生成图像 Prompt...")).toBeInTheDocument();
  });

  it("renders the matched generated image", () => {
    render(<VfxBreakdownCard imageResult={imageResult} vfx={vfx} />);

    expect(screen.getByText("技能特效预览图")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "烈焰冲击 技能特效预览图" }),
    ).toBeInTheDocument();
  });

  it("renders image generation loading state", () => {
    render(<VfxBreakdownCard isImageGenerating vfx={vfx} />);

    expect(screen.getByText("正在生成技能特效图...")).toBeInTheDocument();
  });
});

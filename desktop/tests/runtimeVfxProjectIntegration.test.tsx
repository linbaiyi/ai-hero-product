import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkBackendHealth } from "../src/api/backendApi";
import { renderVfxBoard } from "../src/api/boardApi";
import { exportProject, saveProjectExportZip } from "../src/api/exportApi";
import { generateHeroDesign } from "../src/api/heroApi";
import { generateImage } from "../src/api/imageGenerationApi";
import { generateImagePromptBatch } from "../src/api/imagePromptApi";
import { generatePlayableSpec } from "../src/api/playableApi";
import {
  deleteProject,
  getProject,
  listProjects,
  saveProject,
} from "../src/api/projectApi";
import { generateRuntimeVfxAssets } from "../src/api/runtimeVfxApi";
import { generateVfxBreakdownBatch } from "../src/api/vfxApi";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";
import { defaultRuntimeVfxAssetSpec } from "../src/game-demo/vfx-assets/defaultRuntimeVfxAssetSpec";
import HomePage from "../src/pages/HomePage";
import type { ProjectRecord } from "../src/types/project";

vi.mock("../src/api/backendApi", () => ({ checkBackendHealth: vi.fn() }));
vi.mock("../src/api/heroApi", () => ({ generateHeroDesign: vi.fn() }));
vi.mock("../src/api/vfxApi", () => ({ generateVfxBreakdownBatch: vi.fn() }));
vi.mock("../src/api/imagePromptApi", () => ({
  generateImagePromptBatch: vi.fn(),
}));
vi.mock("../src/api/imageGenerationApi", () => ({ generateImage: vi.fn() }));
vi.mock("../src/api/boardApi", () => ({ renderVfxBoard: vi.fn() }));
vi.mock("../src/api/exportApi", () => ({
  exportProject: vi.fn(),
  saveProjectExportZip: vi.fn(),
}));
vi.mock("../src/api/projectApi", () => ({
  saveProject: vi.fn(),
  listProjects: vi.fn(),
  getProject: vi.fn(),
  deleteProject: vi.fn(),
}));
vi.mock("../src/api/playableApi", () => ({ generatePlayableSpec: vi.fn() }));
vi.mock("../src/api/runtimeVfxApi", () => ({
  generateRuntimeVfxAssets: vi.fn(),
}));

const mockedCheckBackendHealth = vi.mocked(checkBackendHealth);
const mockedGenerateHeroDesign = vi.mocked(generateHeroDesign);
const mockedGenerateVfxBreakdownBatch = vi.mocked(generateVfxBreakdownBatch);
const mockedGenerateImagePromptBatch = vi.mocked(generateImagePromptBatch);
const mockedGenerateImage = vi.mocked(generateImage);
const mockedRenderVfxBoard = vi.mocked(renderVfxBoard);
const mockedExportProject = vi.mocked(exportProject);
const mockedSaveProjectExportZip = vi.mocked(saveProjectExportZip);
const mockedSaveProject = vi.mocked(saveProject);
const mockedListProjects = vi.mocked(listProjects);
const mockedGetProject = vi.mocked(getProject);
const mockedDeleteProject = vi.mocked(deleteProject);
const mockedGeneratePlayableSpec = vi.mocked(generatePlayableSpec);
const mockedGenerateRuntimeVfxAssets = vi.mocked(generateRuntimeVfxAssets);

function projectRecord(
  runtime_vfx_asset_spec: unknown = null,
): ProjectRecord {
  return {
    project_id: "desktop_runtime_project",
    request: {
      game_type: "MOBA",
      hero_role: "Mage",
      element_theme: "Fire",
      art_style: "Stylized",
      core_gameplay: "Burst",
      skill_count: 4,
      generate_images: true,
      generate_board: true,
    },
    hero_design: {
      hero_name: "Runtime Hero",
      hero_title: "Texture Runner",
      role: "Mage",
      difficulty: 3,
      core_tags: ["fire"],
      background: "Test background",
      combat_style: "Burst caster",
      skills: [],
      combo_logic: "Q W E R",
      counterplay: "Dodge",
      balance_summary: "Balanced",
    },
    vfx_designs: [],
    image_prompts: [],
    image_results: [],
    board_result: null,
    playable_spec: defaultPlayableSpec,
    runtime_vfx_asset_spec: runtime_vfx_asset_spec as any,
    llm_provider: "fake",
    image_provider: "fake",
    created_at: "2026-05-12T00:00:00Z",
    updated_at: "2026-05-12T00:00:00Z",
  };
}

async function openProject(record = projectRecord()) {
  mockedListProjects.mockResolvedValue({
    projects: [
      {
        project_id: record.project_id,
        hero_name: record.hero_design.hero_name,
        hero_title: record.hero_design.hero_title,
        role: record.hero_design.role,
        element_theme: record.request.element_theme,
        art_style: record.request.art_style,
        board_path: null,
        created_at: record.created_at,
        updated_at: record.updated_at,
      },
    ],
    total: 1,
  });
  mockedGetProject.mockResolvedValue(record);

  render(<HomePage />);

  clickActivity("Projects");
  await screen.findByText("Runtime Hero");
  fireEvent.click(screen.getByRole("button", { name: /打开|鎵撳紑/ }));
  await waitFor(() => expect(mockedGetProject).toHaveBeenCalled());
}

function clickActivity(name: string) {
  fireEvent.click(within(screen.getByLabelText("Activity Bar")).getByRole("button", { name }));
}

describe("runtime vfx project integration", () => {
  beforeEach(() => {
    mockedCheckBackendHealth.mockResolvedValue({
      status: "ok",
      service: "ai-game-hero-designer-backend",
      version: "0.1.0",
    });
    mockedGenerateHeroDesign.mockReset();
    mockedGenerateVfxBreakdownBatch.mockReset();
    mockedGenerateImagePromptBatch.mockReset();
    mockedGenerateImage.mockReset();
    mockedRenderVfxBoard.mockReset();
    mockedExportProject.mockReset();
    mockedSaveProjectExportZip.mockReset();
    mockedSaveProject.mockImplementation(async (request) => ({
      ...request,
      created_at: "2026-05-12T00:00:00Z",
      updated_at: "2026-05-12T00:00:01Z",
    }));
    mockedListProjects.mockResolvedValue({ projects: [], total: 0 });
    mockedGetProject.mockReset();
    mockedDeleteProject.mockReset();
    mockedGeneratePlayableSpec.mockReset();
    mockedGenerateRuntimeVfxAssets.mockReset();
  });

  it("shows disabled runtime vfx generation without playableSpec", async () => {
    render(<HomePage />);

    clickActivity("Assets");
    const runtimePanel = screen.getByLabelText("Runtime VFX Assets");
    const button = runtimePanel.querySelector("button");

    expect(button).toBeDisabled();
    expect(screen.getByText("请先在 Blueprint 页面生成试玩配置。")).toBeInTheDocument();
  });

  it("generates runtime vfx and saves runtime_vfx_asset_spec", async () => {
    await openProject(projectRecord(null));
    mockedGenerateRuntimeVfxAssets.mockResolvedValue({
      runtime_vfx_asset_spec: defaultRuntimeVfxAssetSpec,
      generated_assets: [
        {
          slot: "Q",
          skill_name: "Q",
          skill_type: "projectile",
          usage: "projectile",
          render_mode: "sprite",
          path: "runtime_vfx/test/Q_projectile.png",
          prompt: "prompt",
          width: 512,
          height: 512,
        },
      ],
      warnings: ["Skipped Q trail"],
    });

    clickActivity("Assets");
    const runtimePanel = screen.getByLabelText("Runtime VFX Assets");
    fireEvent.click(runtimePanel.querySelector("button")!);

    await waitFor(() => expect(mockedGenerateRuntimeVfxAssets).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockedSaveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime_vfx_asset_spec: defaultRuntimeVfxAssetSpec,
        }),
      ),
    );
    expect(screen.getByText(/generated_assets: 1/)).toBeInTheDocument();
    expect(screen.getByText("Skipped Q trail")).toBeInTheDocument();
  });

  it("restores runtime_vfx_asset_spec from history project", async () => {
    await openProject(projectRecord(defaultRuntimeVfxAssetSpec));

    clickActivity("Assets");

    expect(screen.getByText(/hero_id: flame_guardian/)).toBeInTheDocument();
  });

  it("opens history project without runtime_vfx_asset_spec without crashing", async () => {
    await openProject(projectRecord(null));

    clickActivity("Assets");

    expect(screen.getByText("当前还没有运行时贴图资产")).toBeInTheDocument();
  });

  it("skips invalid runtime_vfx_asset_spec from history project", async () => {
    await openProject(projectRecord({ version: "2.0" }));

    clickActivity("Assets");

    expect(
      screen.getByText(/运行时贴图资产配置无效|runtime_vfx/i),
    ).toBeInTheDocument();
  });
});

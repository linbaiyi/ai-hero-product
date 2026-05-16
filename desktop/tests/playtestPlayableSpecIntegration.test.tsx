import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePlayableSpec } from "../src/api/playableApi";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";
import type { HeroPlayableSpec } from "../src/game-demo/specs/playableSpecTypes";
import { defaultRuntimeVfxAssetSpec } from "../src/game-demo/vfx-assets/defaultRuntimeVfxAssetSpec";
import PlaytestView from "../src/game-demo/playtest/PlaytestView";
import HomePage from "../src/pages/HomePage";
import type {
  BoardRenderResult,
  HeroDesign,
  ProjectRecord,
  ProjectSummary,
} from "../src/types/project";

vi.mock("../src/api/backendApi", () => ({
  BACKEND_BASE_URL: "http://127.0.0.1:8001",
  checkBackendHealth: vi.fn().mockResolvedValue({
    status: "ok",
    service: "ai-game-hero-designer-backend",
    version: "0.1.0",
  }),
  readBackendErrorMessage: vi.fn(),
}));
vi.mock("../src/api/heroApi", () => ({ generateHeroDesign: vi.fn() }));
vi.mock("../src/api/vfxApi", () => ({ generateVfxBreakdownBatch: vi.fn() }));
vi.mock("../src/api/imagePromptApi", () => ({ generateImagePromptBatch: vi.fn() }));
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
  importProjectArchive: vi.fn(),
  deleteProject: vi.fn(),
  updateProjectSkill: vi.fn(),
}));
vi.mock("../src/api/playableApi", () => ({ generatePlayableSpec: vi.fn() }));
vi.mock("../src/game-demo/playtest/playtestRuntime", () => {
  const makeSnapshot = (spec: any) => ({
    hero_name: spec.hero.name,
    hp: spec.hero.max_hp,
    max_hp: spec.hero.max_hp,
    resource: spec.hero.max_resource,
    max_resource: spec.hero.max_resource,
    resource_type: spec.hero.resource_type,
    runtime_vfx_enabled: false,
    runtime_vfx_composition_enabled: false,
    runtime_vfx_warnings: [],
    runtime_vfx_instance_count: 0,
    no_cooldown_enabled: false,
    skills: spec.skills.map((skill: any) => ({
      slot: skill.slot,
      name: skill.name,
      cooldown_remaining: 0,
    })),
  });

  return {
    PlaytestRuntime: class {
      private readonly spec: any;
      private readonly runtimeVfxAssetSpec: any;

      constructor(_container: HTMLElement, options: { spec: any; runtimeVfxAssetSpec?: any }) {
        this.spec = options.spec;
        this.runtimeVfxAssetSpec = options.runtimeVfxAssetSpec;
      }

      getStateSnapshot() {
        return {
          ...makeSnapshot(this.spec),
          runtime_vfx_enabled: Boolean(this.runtimeVfxAssetSpec),
          runtime_vfx_composition_enabled: Boolean(this.runtimeVfxAssetSpec),
          runtime_vfx_instance_count: this.runtimeVfxAssetSpec ? 3 : 0,
        };
      }

      reset() {
        return {};
      }

      setNoCooldownEnabled() {}

      dispose() {}
    },
    createPlaytestInitialState: (spec: any) => ({ spec }),
    createPlaytestSnapshot: (state: { spec?: any }, spec: any) =>
      makeSnapshot(spec ?? state.spec),
  };
});

import { renderVfxBoard } from "../src/api/boardApi";
import { generateImage } from "../src/api/imageGenerationApi";
import { generateImagePromptBatch } from "../src/api/imagePromptApi";
import { getProject, listProjects, saveProject } from "../src/api/projectApi";
import { generateVfxBreakdownBatch } from "../src/api/vfxApi";

const customPlayableSpec: HeroPlayableSpec = {
  ...defaultPlayableSpec,
  hero: {
    ...defaultPlayableSpec.hero,
    id: "solar_warden",
    name: "Solar Warden",
    title: "Keeper of the Trial Gate",
  },
  skills: defaultPlayableSpec.skills.map((skill) => ({
    ...skill,
    name: `Solar ${skill.slot}`,
    vfx: { ...skill.vfx, theme: "holy", color: "#ffd700" },
  })),
  gameplay_tags: ["holy", "training_demo"],
};

const hero: HeroDesign = {
  hero_name: "Solar Warden",
  hero_title: "Keeper of the Trial Gate",
  role: "fighter",
  difficulty: 3,
  core_tags: ["holy", "area_damage"],
  background: "A test hero.",
  combat_style: "Mid range control.",
  skills: [],
  combo_logic: "Q into W.",
  counterplay: "Dodge the setup.",
  balance_summary: "Stable demo hero.",
};

const boardResult: BoardRenderResult = {
  project_id: "desktop_123",
  board_path: "outputs/boards/desktop_123/vfx_board.png",
  file_name: "vfx_board.png",
  width: 1600,
  height: 2400,
  success: true,
  error_message: null,
};

const projectSummary: ProjectSummary = {
  project_id: "desktop_123",
  hero_name: hero.hero_name,
  hero_title: hero.hero_title,
  role: hero.role,
  element_theme: "holy",
  art_style: "stylized",
  board_path: boardResult.board_path,
  created_at: "2026-05-08T10:00:00Z",
  updated_at: "2026-05-08T10:30:00Z",
};

const projectRecord: ProjectRecord = {
  project_id: "desktop_123",
  request: {
    game_type: "MOBA",
    hero_role: "fighter",
    element_theme: "holy",
    art_style: "stylized",
    core_gameplay: "area control",
    skill_count: 5,
    generate_images: true,
    generate_board: true,
  },
  hero_design: hero,
  vfx_designs: [],
  image_prompts: [],
  image_results: [],
  board_result: boardResult,
  llm_provider: null,
  image_provider: null,
  created_at: "2026-05-08T10:00:00Z",
  updated_at: "2026-05-08T10:30:00Z",
};

describe("Playtest playable spec integration", () => {
  beforeEach(() => {
    vi.mocked(generatePlayableSpec).mockReset();
    vi.mocked(generatePlayableSpec).mockResolvedValue(customPlayableSpec);
    vi.mocked(listProjects).mockResolvedValue({ projects: [projectSummary], total: 1 });
    vi.mocked(getProject).mockResolvedValue(projectRecord);
    vi.mocked(saveProject).mockResolvedValue(projectRecord);
    vi.mocked(generateVfxBreakdownBatch).mockResolvedValue([]);
    vi.mocked(generateImagePromptBatch).mockResolvedValue([]);
    vi.mocked(generateImage).mockResolvedValue({
      skill_name: "test",
      image_path: "outputs/images/test.png",
      file_name: "test.png",
      width: 1024,
      height: 1024,
      success: true,
      error_message: null,
    });
    vi.mocked(renderVfxBoard).mockResolvedValue(boardResult);
  });

  it("PlaytestView shows default Flame Guardian without a spec", () => {
    render(<PlaytestView />);

    expect(screen.getByText("默认测试英雄：Flame Guardian")).toBeInTheDocument();
    expect(screen.getByText("Flame Guardian")).toBeInTheDocument();
  });

  it("PlaytestView shows Flame Guardian when defaultPlayableSpec is passed", () => {
    render(
      <PlaytestView
        playableSpec={defaultPlayableSpec}
        playableSpecSource="current_project"
      />,
    );

    expect(screen.getByText("当前英雄试玩：Flame Guardian")).toBeInTheDocument();
  });

  it("PlaytestView shows custom hero when a custom spec is passed", () => {
    render(
      <PlaytestView
        playableSpec={customPlayableSpec}
        playableSpecSource="current_project"
      />,
    );

    expect(screen.getByText("当前英雄试玩：Solar Warden")).toBeInTheDocument();
    expect(screen.getByText("Solar Warden")).toBeInTheDocument();
  });

  it("Reset keeps the passed custom spec", () => {
    render(
      <PlaytestView
        playableSpec={customPlayableSpec}
        playableSpecSource="current_project"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByText("Solar Warden")).toBeInTheDocument();
  });

  it("PlaytestView without runtimeVfxAssetSpec shows fallback text", () => {
    render(<PlaytestView playableSpec={defaultPlayableSpec} />);

    expect(screen.getByText("Runtime VFX: fallback geometry active")).toBeInTheDocument();
  });

  it("PlaytestView with runtimeVfxAssetSpec shows runtime texture enabled text", () => {
    render(
      <PlaytestView
        playableSpec={defaultPlayableSpec}
        runtimeVfxAssetSpec={defaultRuntimeVfxAssetSpec}
      />,
    );

    expect(screen.getByText("Runtime VFX: texture + procedural enabled")).toBeInTheDocument();
  });

  it("PlaytestView can toggle no cooldown mode", () => {
    render(<PlaytestView playableSpec={defaultPlayableSpec} />);

    fireEvent.click(screen.getByRole("button", { name: "无 CD：关" }));

    expect(screen.getByRole("button", { name: "无 CD：开" })).toBeInTheDocument();
  });

  it("HomePage Blueprint can generate playable spec and Playtest uses it", async () => {
    render(<HomePage />);

    fireEvent.click(await screen.findByRole("button", { name: /打开|Open/ }));
    expect(await screen.findByText("生成试玩配置")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "生成试玩配置" }));

    await waitFor(() => expect(generatePlayableSpec).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(saveProject).toHaveBeenCalledWith(
        expect.objectContaining({ playable_spec: customPlayableSpec }),
      ),
    );
    expect(await screen.findByText("试玩配置已生成")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "进入 Playtest" }));

    expect(await screen.findByText("当前英雄试玩：Solar Warden")).toBeInTheDocument();
  });

  it("HomePage restores playable_spec from history before Playtest", async () => {
    vi.mocked(getProject).mockResolvedValueOnce({
      ...projectRecord,
      playable_spec: customPlayableSpec,
    });

    render(<HomePage />);

    fireEvent.click(await screen.findByRole("button", { name: /打开|Open/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Playtest" }));

    expect(await screen.findByText("当前英雄试玩：Solar Warden")).toBeInTheDocument();
  });

  it("HomePage falls back when history playable_spec is invalid", async () => {
    vi.mocked(getProject).mockResolvedValueOnce({
      ...projectRecord,
      playable_spec: { version: "2.0" } as any,
    });

    render(<HomePage />);

    fireEvent.click(await screen.findByRole("button", { name: /打开|Open/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Playtest" }));

    expect(await screen.findByText("默认测试英雄：Flame Guardian")).toBeInTheDocument();
  });
});

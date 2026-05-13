import { useCallback, useEffect, useState } from "react";
import { checkBackendHealth } from "../api/backendApi";
import { renderVfxBoard } from "../api/boardApi";
import { exportProject, saveProjectExportZip } from "../api/exportApi";
import { generateHeroDesign } from "../api/heroApi";
import { generateImage } from "../api/imageGenerationApi";
import { generateImagePromptBatch } from "../api/imagePromptApi";
import { generatePlayableSpec } from "../api/playableApi";
import {
  generateRuntimeVfxAssets,
  type RuntimeVfxGeneratedAsset,
} from "../api/runtimeVfxApi";
import {
  deleteProject,
  getProject,
  listProjects,
  saveProject,
} from "../api/projectApi";
import { generateVfxBreakdownBatch } from "../api/vfxApi";
import ActivityBar, { type ActivityView } from "../components/ActivityBar";
import AppHeader from "../components/AppHeader";
import BackendStatusBadge from "../components/BackendStatusBadge";
import ErrorPanel from "../components/ErrorPanel";
import HeroInputForm from "../components/HeroInputForm";
import HeroResultPanel from "../components/HeroResultPanel";
import ProjectHistoryPanel from "../components/ProjectHistoryPanel";
import ProjectExportPanel from "../components/ProjectExportPanel";
import ProjectSaveStatus from "../components/ProjectSaveStatus";
import VfxBreakdownPanel from "../components/VfxBreakdownPanel";
import PlaytestView from "../game-demo/playtest/PlaytestView";
import { normalizePlayableSpec } from "../game-demo/specs/normalizePlayableSpec";
import type { HeroPlayableSpec } from "../game-demo/specs/playableSpecTypes";
import { normalizeRuntimeVfxAssetSpec } from "../game-demo/vfx-assets/normalizeRuntimeVfxAssetSpec";
import type { RuntimeVfxAssetSpec } from "../game-demo/vfx-assets/runtimeVfxTypes";
import type {
  BackendConnectionStatus,
  BackendHealthResponse,
} from "../types/backend";
import type {
  BoardRenderResult,
  ExportProjectRequest,
  ExportProjectResult,
  HeroDesign,
  HeroGenerateRequest,
  ImageGenerationResult,
  ImagePromptResult,
  ProjectExportStatusType,
  ProjectRecord,
  ProjectSaveStatusType,
  ProjectSummary,
  VfxDesign,
} from "../types/project";

type PlayableSpecStatus = "idle" | "generating" | "ready" | "error";
type RuntimeVfxStatus = "idle" | "generating" | "ready" | "error";

const IMAGE_REQUEST_DELAY_MS = 1200;

function waitForNextImageRequest(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, IMAGE_REQUEST_DELAY_MS);
  });
}

function HomePage() {
  const [submittedRequest, setSubmittedRequest] =
    useState<HeroGenerateRequest | null>(null);
  const [lastRequest, setLastRequest] = useState<HeroGenerateRequest | null>(
    null,
  );
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [heroDesign, setHeroDesign] = useState<HeroDesign | null>(null);
  const [isGeneratingHero, setIsGeneratingHero] = useState(false);
  const [heroGenerateError, setHeroGenerateError] = useState<string | null>(
    null,
  );
  const [vfxDesigns, setVfxDesigns] = useState<VfxDesign[]>([]);
  const [isGeneratingVfx, setIsGeneratingVfx] = useState(false);
  const [vfxGenerateError, setVfxGenerateError] = useState<string | null>(null);
  const [imagePrompts, setImagePrompts] = useState<ImagePromptResult[]>([]);
  const [isGeneratingImagePrompts, setIsGeneratingImagePrompts] =
    useState(false);
  const [imagePromptError, setImagePromptError] = useState<string | null>(null);
  const [imageResults, setImageResults] = useState<ImageGenerationResult[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageGenerateError, setImageGenerateError] = useState<string | null>(
    null,
  );
  const [boardResult, setBoardResult] = useState<BoardRenderResult | null>(null);
  const [isRenderingBoard, setIsRenderingBoard] = useState(false);
  const [boardRenderError, setBoardRenderError] = useState<string | null>(null);
  const [projectSaveStatus, setProjectSaveStatus] =
    useState<ProjectSaveStatusType>("idle");
  const [projectSaveError, setProjectSaveError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] =
    useState<ProjectExportStatusType>("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportProjectResult | null>(
    null,
  );
  const [playableSpec, setPlayableSpec] = useState<HeroPlayableSpec | null>(null);
  const [playableSpecStatus, setPlayableSpecStatus] =
    useState<PlayableSpecStatus>("idle");
  const [playableSpecError, setPlayableSpecError] = useState<string | null>(null);
  const [runtimeVfxAssetSpec, setRuntimeVfxAssetSpec] =
    useState<RuntimeVfxAssetSpec | null>(null);
  const [runtimeVfxStatus, setRuntimeVfxStatus] =
    useState<RuntimeVfxStatus>("idle");
  const [runtimeVfxError, setRuntimeVfxError] = useState<string | null>(null);
  const [runtimeVfxWarnings, setRuntimeVfxWarnings] = useState<string[]>([]);
  const [runtimeVfxGeneratedAssets, setRuntimeVfxGeneratedAssets] = useState<
    RuntimeVfxGeneratedAsset[]
  >([]);
  const [runtimeVfxRestoreAttemptedFor, setRuntimeVfxRestoreAttemptedFor] =
    useState<string | null>(null);
  const [savedProject, setSavedProject] = useState<ProjectRecord | null>(null);
  const [historyProjects, setHistoryProjects] = useState<ProjectSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] =
    useState<BackendConnectionStatus>("checking");
  const [backendHealth, setBackendHealth] =
    useState<BackendHealthResponse | null>(null);
  const [backendError, setBackendError] = useState<string | undefined>();
  const [activeView, setActiveView] = useState<ActivityView>("generate");

  const detectBackend = useCallback(async () => {
    setBackendStatus("checking");
    setBackendError(undefined);

    try {
      const health = await checkBackendHealth();
      setBackendHealth(health);
      setBackendStatus("connected");
    } catch (error) {
      setBackendHealth(null);
      setBackendStatus("failed");
      setBackendError(
        error instanceof Error
          ? error.message
          : "无法连接本地后端服务，请确认 FastAPI 后端已启动。",
      );
    }
  }, []);

  useEffect(() => {
    void detectBackend();
  }, [detectBackend]);

  const loadHistoryProjects = useCallback(async () => {
    setHistoryError(null);
    setIsLoadingHistory(true);

    try {
      const response = await listProjects();
      setHistoryProjects(response.projects);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "历史项目加载失败，请稍后重试。",
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadHistoryProjects();
  }, [loadHistoryProjects]);

  const saveGeneratedProject = useCallback(
    async (
      projectId: string,
      request: HeroGenerateRequest,
      hero: HeroDesign,
      designs: VfxDesign[],
      prompts: ImagePromptResult[],
      results: ImageGenerationResult[],
      board: BoardRenderResult | null,
    ) => {
      setProjectSaveStatus("saving");
      setProjectSaveError(null);

      try {
        const record = await saveProject({
          project_id: projectId,
          request,
          hero_design: hero,
          vfx_designs: designs,
          image_prompts: prompts,
          image_results: results,
          board_result: board,
          playable_spec: playableSpec,
          runtime_vfx_asset_spec: runtimeVfxAssetSpec,
          llm_provider: null,
          image_provider: null,
        });
        setSavedProject(record);
        setActiveProjectId(record.project_id);
        setProjectSaveStatus("saved");
        await loadHistoryProjects();
      } catch (error) {
        setProjectSaveError(
          error instanceof Error ? error.message : "项目保存失败，请稍后重试。",
        );
        setProjectSaveStatus("failed");
      }
    },
    [loadHistoryProjects, playableSpec, runtimeVfxAssetSpec],
  );

  const renderBoardForResults = useCallback(
    async (
      projectId: string,
      hero: HeroDesign,
      designs: VfxDesign[],
      results: ImageGenerationResult[],
      request?: HeroGenerateRequest,
      prompts: ImagePromptResult[] = [],
    ) => {
      setBoardRenderError(null);
      setIsRenderingBoard(true);

      try {
        const board = await renderVfxBoard({
          project_id: projectId,
          hero_design: hero,
          vfx_designs: designs,
          image_results: results,
          board_title: `${hero.hero_name} 技能特效设计稿`,
          width: 1600,
          height: 2400,
        });
        setBoardResult(board);
        if (request) {
          await saveGeneratedProject(
            projectId,
            request,
            hero,
            designs,
            prompts,
            results,
            board,
          );
        }
      } catch (error) {
        setBoardRenderError(
          error instanceof Error
            ? error.message
            : "技能特效设计板生成失败，请稍后重试。",
        );
      } finally {
        setIsRenderingBoard(false);
      }
    },
    [saveGeneratedProject],
  );

  const generateImagesForPrompts = useCallback(
    async (
      prompts: ImagePromptResult[],
      projectId: string,
      hero: HeroDesign,
      designs: VfxDesign[],
      request: HeroGenerateRequest,
    ) => {
      setImageGenerateError(null);
      setBoardRenderError(null);
      setIsGeneratingImages(true);

      try {
        const results: ImageGenerationResult[] = [];
        for (const [index, imagePrompt] of prompts.entries()) {
          if (index > 0) {
            await waitForNextImageRequest();
          }
          const result = await generateImage({
            project_id: projectId,
            width: 1024,
            height: 1024,
            image_prompt: imagePrompt,
          });
          results.push(result);
          setImageResults([...results]);
        }
        setImageResults(results);
        setIsGeneratingImages(false);
        await renderBoardForResults(
          projectId,
          hero,
          designs,
          results,
          request,
          prompts,
        );
      } catch (error) {
        setImageGenerateError(
          error instanceof Error
            ? error.message
            : "技能特效图片生成失败，请稍后重试。",
        );
        setIsGeneratingImages(false);
      }
    },
    [renderBoardForResults],
  );

  const generateImagePromptsForVfx = useCallback(
    async (
      designs: VfxDesign[],
      request: HeroGenerateRequest,
      projectId: string,
      hero: HeroDesign,
    ) => {
      setImagePromptError(null);
      setImageGenerateError(null);
      setBoardRenderError(null);
      setIsGeneratingImagePrompts(true);

      try {
        const prompts = await generateImagePromptBatch({
          vfx_designs: designs,
          style_hint: `${request.art_style} game skill VFX thumbnail`,
        });
        setImagePrompts(prompts);
        setIsGeneratingImagePrompts(false);
        await generateImagesForPrompts(
          prompts,
          projectId,
          hero,
          designs,
          request,
        );
      } catch (error) {
        setImagePromptError(
          error instanceof Error
            ? error.message
            : "图像 Prompt 生成失败，请稍后重试。",
        );
        setIsGeneratingImagePrompts(false);
      }
    },
    [generateImagesForPrompts],
  );

  const generateVfxForHero = useCallback(
    async (hero: HeroDesign, request: HeroGenerateRequest, projectId: string) => {
      setVfxGenerateError(null);
      setImagePromptError(null);
      setImageGenerateError(null);
      setBoardRenderError(null);
      setIsGeneratingVfx(true);

      try {
        const designs = await generateVfxBreakdownBatch({
          hero_name: hero.hero_name,
          element_theme: request.element_theme,
          art_style: request.art_style,
          skills: hero.skills,
        });
        setVfxDesigns(designs);
        setIsGeneratingVfx(false);
        await generateImagePromptsForVfx(designs, request, projectId, hero);
      } catch (error) {
        setVfxGenerateError(
          error instanceof Error
            ? error.message
            : "技能特效拆解失败，请稍后重试。",
        );
        setIsGeneratingVfx(false);
      }
    },
    [generateImagePromptsForVfx],
  );

  const handleSubmit = useCallback(
    async (data: HeroGenerateRequest) => {
      const projectId = `desktop_${Date.now()}`;
      setSubmittedRequest(data);
      setLastRequest(data);
      setCurrentProjectId(projectId);
      setHeroDesign(null);
      setVfxDesigns([]);
      setImagePrompts([]);
      setImageResults([]);
      setBoardResult(null);
      setHeroGenerateError(null);
      setVfxGenerateError(null);
      setImagePromptError(null);
      setImageGenerateError(null);
      setBoardRenderError(null);
      setProjectSaveStatus("idle");
      setProjectSaveError(null);
      setExportStatus("idle");
      setExportError(null);
      setExportResult(null);
      setPlayableSpec(null);
      setPlayableSpecStatus("idle");
      setPlayableSpecError(null);
      setRuntimeVfxAssetSpec(null);
      setRuntimeVfxStatus("idle");
      setRuntimeVfxError(null);
      setRuntimeVfxWarnings([]);
      setRuntimeVfxGeneratedAssets([]);
      setRuntimeVfxRestoreAttemptedFor(null);
      setSavedProject(null);
      setActiveProjectId(null);
      setIsGeneratingHero(true);

      try {
        const design = await generateHeroDesign(data);
        setHeroDesign(design);
        setActiveView("blueprint");
        setIsGeneratingHero(false);
        await generateVfxForHero(design, data, projectId);
      } catch (error) {
        setHeroGenerateError(
          error instanceof Error
            ? error.message
            : "英雄方案生成失败，请检查输入或稍后重试。",
        );
        setIsGeneratingHero(false);
      }
    },
    [generateVfxForHero],
  );

  const handleRetryGenerate = () => {
    if (lastRequest) {
      void handleSubmit(lastRequest);
    }
  };

  const handleRetryVfx = () => {
    if (heroDesign && lastRequest && currentProjectId) {
      setImagePrompts([]);
      setImageResults([]);
      setBoardResult(null);
      void generateVfxForHero(heroDesign, lastRequest, currentProjectId);
    }
  };

  const handleRetryImagePrompt = () => {
    if (vfxDesigns.length > 0 && lastRequest && currentProjectId && heroDesign) {
      setImageResults([]);
      setBoardResult(null);
      void generateImagePromptsForVfx(
        vfxDesigns,
        lastRequest,
        currentProjectId,
        heroDesign,
      );
    }
  };

  const handleRetryImages = () => {
    if (
      imagePrompts.length > 0 &&
      currentProjectId &&
      heroDesign &&
      vfxDesigns.length > 0 &&
      lastRequest
    ) {
      setBoardResult(null);
      void generateImagesForPrompts(
        imagePrompts,
        currentProjectId,
        heroDesign,
        vfxDesigns,
        lastRequest,
      );
    }
  };

  const handleRetryBoard = () => {
    if (
      currentProjectId &&
      heroDesign &&
      vfxDesigns.length > 0 &&
      imageResults.length > 0 &&
      lastRequest
    ) {
      void renderBoardForResults(
        currentProjectId,
        heroDesign,
        vfxDesigns,
        imageResults,
        lastRequest,
        imagePrompts,
      );
    }
  };

  const handleRetrySaveProject = () => {
    if (
      currentProjectId &&
      lastRequest &&
      heroDesign &&
      vfxDesigns.length > 0 &&
      imageResults.length > 0
    ) {
      void saveGeneratedProject(
        currentProjectId,
        lastRequest,
        heroDesign,
        vfxDesigns,
        imagePrompts,
        imageResults,
        boardResult,
      );
    }
  };

  const handleOpenProject = async (projectId: string) => {
    try {
      const project = await getProject(projectId);
      setSubmittedRequest(project.request);
      setLastRequest(project.request);
      setCurrentProjectId(project.project_id);
      setHeroDesign(project.hero_design);
      setVfxDesigns(project.vfx_designs);
      setImagePrompts(project.image_prompts);
      setImageResults(project.image_results);
      setBoardResult(project.board_result);
      setHeroGenerateError(null);
      setVfxGenerateError(null);
      setImagePromptError(null);
      setImageGenerateError(null);
      setBoardRenderError(null);
      setProjectSaveError(null);
      setExportStatus("idle");
      setExportError(null);
      setExportResult(null);
      setPlayableSpec(null);
      setPlayableSpecStatus("idle");
      setPlayableSpecError(null);
      setRuntimeVfxAssetSpec(null);
      setRuntimeVfxStatus("idle");
      setRuntimeVfxError(null);
      setRuntimeVfxWarnings([]);
      setRuntimeVfxGeneratedAssets([]);
      setRuntimeVfxRestoreAttemptedFor(project.project_id);
      setIsGeneratingHero(false);
      setIsGeneratingVfx(false);
      setIsGeneratingImagePrompts(false);
      setIsGeneratingImages(false);
      setIsRenderingBoard(false);
      setSavedProject(project);
      setActiveProjectId(project.project_id);
      setProjectSaveStatus("saved");
      try {
        setPlayableSpec(
          project.playable_spec ? normalizePlayableSpec(project.playable_spec) : null,
        );
        setPlayableSpecStatus(project.playable_spec ? "ready" : "idle");
        setPlayableSpecError(null);
      } catch {
        setPlayableSpec(null);
        setPlayableSpecStatus("error");
        setPlayableSpecError(
          "历史项目中的试玩配置无效，已回退到默认测试英雄。",
        );
      }
      try {
        setRuntimeVfxAssetSpec(
          project.runtime_vfx_asset_spec
            ? normalizeRuntimeVfxAssetSpec(project.runtime_vfx_asset_spec)
            : null,
        );
        setRuntimeVfxStatus(project.runtime_vfx_asset_spec ? "ready" : "idle");
        setRuntimeVfxError(null);
        setRuntimeVfxWarnings([]);
        setRuntimeVfxGeneratedAssets([]);
      } catch {
        setRuntimeVfxAssetSpec(null);
        setRuntimeVfxStatus("error");
        setRuntimeVfxRestoreAttemptedFor(project.project_id);
        setRuntimeVfxError(
          "历史项目中的运行时贴图资产配置无效，已跳过该配置。",
        );
      }
      setActiveView("blueprint");
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "项目不存在或已被删除。",
      );
    }
  };

  const handleDeleteHistoryProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      if (projectId === activeProjectId) {
        setActiveProjectId(null);
        setSavedProject(null);
        setProjectSaveStatus("idle");
        setExportStatus("idle");
        setExportError(null);
        setExportResult(null);
      }
      await loadHistoryProjects();
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "项目删除失败，请稍后重试。",
      );
    }
  };

  const handleExportProject = async (options: ExportProjectRequest) => {
    if (!currentProjectId) {
      setExportError("暂无可导出的项目");
      setExportStatus("failed");
      return;
    }

    setExportStatus("exporting");
    setExportError(null);

    try {
      const result = await exportProject(currentProjectId, options);
      setExportResult(result);
      setExportStatus("exported");
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "项目导出失败，请稍后重试。",
      );
      setExportStatus("failed");
    }
  };

  const handleDownloadExport = async () => {
    if (!currentProjectId) {
      return;
    }

    try {
      await saveProjectExportZip(currentProjectId, exportResult?.file_name);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "项目资料包下载失败，请稍后重试。",
      );
      setExportStatus("failed");
    }
  };

  const handleGeneratePlayableSpec = async () => {
    if (!heroDesign) {
      setPlayableSpecError("请先生成英雄方案，再生成试玩配置。");
      setPlayableSpecStatus("error");
      return;
    }

    setPlayableSpecStatus("generating");
    setPlayableSpecError(null);

    try {
      const spec = await generatePlayableSpec({
        hero_design: JSON.stringify(heroDesign, null, 2),
        style: "3d_training_demo",
        complexity: "mvp",
      });
      setPlayableSpec(spec);
      setPlayableSpecStatus("ready");
      setRuntimeVfxAssetSpec(null);
      setRuntimeVfxStatus("idle");
      setRuntimeVfxError(null);
      setRuntimeVfxWarnings([]);
      setRuntimeVfxGeneratedAssets([]);
      if (currentProjectId && lastRequest && heroDesign) {
        try {
          const record = await saveProject({
            project_id: currentProjectId,
            request: lastRequest,
            hero_design: heroDesign,
            vfx_designs: vfxDesigns,
            image_prompts: imagePrompts,
            image_results: imageResults,
            board_result: boardResult,
            playable_spec: spec,
            runtime_vfx_asset_spec: null,
            llm_provider: null,
            image_provider: null,
          });
          setSavedProject(record);
          setActiveProjectId(record.project_id);
          setProjectSaveStatus("saved");
          await loadHistoryProjects();
        } catch {
          setProjectSaveStatus("failed");
          setProjectSaveError(
            "试玩配置已生成，但项目自动保存失败。请稍后重试保存项目。",
          );
        }
      }
    } catch (error) {
      setPlayableSpecError(
        error instanceof Error ? error.message : "试玩配置生成失败，请稍后重试。",
      );
      setPlayableSpecStatus("error");
    }
  };

  const handleGenerateRuntimeVfx = async () => {
    if (!playableSpec) {
      setRuntimeVfxError("请先在 Blueprint 页面生成试玩配置。");
      setRuntimeVfxStatus("error");
      return;
    }

    setRuntimeVfxStatus("generating");
    setRuntimeVfxError(null);
    setRuntimeVfxWarnings([]);

    try {
      const result = await generateRuntimeVfxAssets({
        playable_spec: playableSpec,
        runtime_vfx_asset_spec: null,
        max_textures: 8,
        image_size: "512x512",
        transparent_background: true,
        project_id: currentProjectId,
      });
      setRuntimeVfxAssetSpec(result.runtime_vfx_asset_spec);
      setRuntimeVfxGeneratedAssets(result.generated_assets);
      setRuntimeVfxWarnings(result.warnings);
      setRuntimeVfxStatus("ready");
      setRuntimeVfxRestoreAttemptedFor(currentProjectId);

      if (currentProjectId && lastRequest && heroDesign) {
        try {
          const record = await saveProject({
            project_id: currentProjectId,
            request: lastRequest,
            hero_design: heroDesign,
            vfx_designs: vfxDesigns,
            image_prompts: imagePrompts,
            image_results: imageResults,
            board_result: boardResult,
            playable_spec: playableSpec,
            runtime_vfx_asset_spec: result.runtime_vfx_asset_spec,
            llm_provider: null,
            image_provider: null,
          });
          setSavedProject(record);
          setActiveProjectId(record.project_id);
          setProjectSaveStatus("saved");
          await loadHistoryProjects();
        } catch {
          setProjectSaveStatus("failed");
          setProjectSaveError(
            "运行时贴图资产已生成，但项目自动保存失败。请稍后重试保存项目。",
          );
        }
      }
    } catch (error) {
      setRuntimeVfxError(
        error instanceof Error ? error.message : "运行时贴图资产生成失败，请稍后重试。",
      );
      setRuntimeVfxStatus("error");
    }
  };

  useEffect(() => {
    if (
      activeView !== "playtest" ||
      !activeProjectId ||
      runtimeVfxAssetSpec ||
      savedProject?.runtime_vfx_asset_spec ||
      runtimeVfxRestoreAttemptedFor === activeProjectId
    ) {
      return;
    }

    setRuntimeVfxRestoreAttemptedFor(activeProjectId);
    void getProject(activeProjectId)
      .then((project) => {
        setSavedProject(project);
        if (!project.runtime_vfx_asset_spec) {
          return;
        }
        setRuntimeVfxAssetSpec(
          normalizeRuntimeVfxAssetSpec(project.runtime_vfx_asset_spec),
        );
        setRuntimeVfxStatus("ready");
        setRuntimeVfxError(null);
      })
      .catch(() => {
        // Playtest can still run with default geometry if the optional runtime VFX
        // config cannot be restored.
      });
  }, [
    activeProjectId,
    activeView,
    runtimeVfxAssetSpec,
    runtimeVfxRestoreAttemptedFor,
    savedProject?.runtime_vfx_asset_spec,
  ]);

  const statusText = isGeneratingHero
    ? "Generating Hero"
    : isGeneratingVfx
      ? "Breaking Down VFX"
      : isGeneratingImagePrompts
        ? "Generating Prompts"
        : isGeneratingImages
          ? "Generating Images"
          : isRenderingBoard
            ? "Rendering Board"
            : playableSpecStatus === "generating"
              ? "Generating Playable"
              : runtimeVfxStatus === "generating"
                ? "Generating Runtime VFX"
              : "Ready";

  const viewClass = (view: ActivityView) =>
    `workspace-view ${activeView === view ? "" : "workspace-view-inactive"}`;
  const activeRuntimeVfxAssetSpec =
    runtimeVfxStatus === "error"
      ? null
      : runtimeVfxAssetSpec ?? savedProject?.runtime_vfx_asset_spec ?? null;

  const playableDemoPanel = (
    <section className="rounded-xl border border-slate-400/15 bg-slate-950/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#e6e8eb]">Playable Demo</h3>
          <p className="mt-1 text-sm text-[#747b88]">
            当前 Playtest 使用：{playableSpec ? "当前英雄" : "默认测试英雄"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="ue-button"
            disabled={!heroDesign || playableSpecStatus === "generating"}
            onClick={() => void handleGeneratePlayableSpec()}
            type="button"
          >
            {playableSpecStatus === "generating"
              ? "正在生成试玩配置..."
              : playableSpec
                ? "重新生成试玩配置"
                : "生成试玩配置"}
          </button>
          {playableSpec ? (
            <button
              className="ue-button-primary"
              onClick={() => setActiveView("playtest")}
              type="button"
            >
              进入 Playtest
            </button>
          ) : null}
        </div>
      </div>
      {playableSpecStatus === "ready" ? (
        <p className="mt-2 text-sm text-[#86efac]">试玩配置已生成</p>
      ) : null}
      {playableSpecError ? (
        <div className="mt-3">
          <ErrorPanel
            message={playableSpecError}
            onRetry={heroDesign ? handleGeneratePlayableSpec : undefined}
          />
        </div>
      ) : null}
    </section>
  );

  const runtimeVfxPanel = (
    <section
      aria-label="Runtime VFX Assets"
      className="rounded-xl border border-slate-400/15 bg-slate-950/35 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#e6e8eb]">运行时贴图资产</h3>
          <p className="mt-1 text-sm text-[#747b88]">
            {activeRuntimeVfxAssetSpec
              ? "运行时贴图资产已生成"
              : "当前还没有运行时贴图资产"}
          </p>
        </div>
        <button
          className="ue-button"
          disabled={!playableSpec || runtimeVfxStatus === "generating"}
          onClick={() => void handleGenerateRuntimeVfx()}
          type="button"
        >
          {runtimeVfxStatus === "generating"
            ? "正在生成运行时贴图资产..."
            : activeRuntimeVfxAssetSpec
              ? "重新生成运行时贴图资产"
              : "生成运行时贴图资产"}
        </button>
      </div>
      {!playableSpec ? (
        <p className="mt-3 text-sm text-amber-200">
          请先在 Blueprint 页面生成试玩配置。
        </p>
      ) : null}
      {activeRuntimeVfxAssetSpec ? (
        <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          <p className="font-semibold">运行时贴图资产已生成</p>
          <p className="mt-1">hero_id: {activeRuntimeVfxAssetSpec.hero_id}</p>
          <p className="mt-1">
            技能槽位: {Object.keys(activeRuntimeVfxAssetSpec.skills).join(" / ")}
          </p>
          <p className="mt-1">
            generated_assets: {runtimeVfxGeneratedAssets.length}
          </p>
          {runtimeVfxWarnings.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100">
              {runtimeVfxWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {runtimeVfxError ? (
        <div className="mt-3">
          <ErrorPanel
            message={runtimeVfxError}
            onRetry={playableSpec ? handleGenerateRuntimeVfx : undefined}
          />
        </div>
      ) : null}
    </section>
  );

  return (
    <main className="editor-shell">
      <AppHeader
        activeView={activeView}
        currentProjectLabel={currentProjectId ?? "Unsaved Project"}
        onMenuSelect={setActiveView}
      >
        <div className="hidden items-center gap-2 md:flex">
          <span className="ue-badge ue-badge-blue">{statusText}</span>
          <BackendStatusBadge
            status={backendStatus}
            version={backendHealth?.version}
            errorMessage={backendError}
            onRetry={backendStatus === "failed" ? detectBackend : undefined}
          />
        </div>
      </AppHeader>

      <div className="editor-body">
        <ActivityBar activeView={activeView} onChange={setActiveView} />

        <main className="editor-main-workspace">
          <section className={viewClass("generate")} aria-label="Generate Hero">
            <div className="view-header">
              <h2 className="view-title">Generate Hero</h2>
              <p className="view-description">
                配置英雄需求并生成完整技能方案。
              </p>
            </div>
            <div className="view-grid-two">
              <HeroInputForm
                onSubmit={(data) => void handleSubmit(data)}
                isSubmitting={isGeneratingHero}
              />
              <div className="space-y-3">
                {submittedRequest ? (
                  <SubmittedRequestPreview request={submittedRequest} />
                ) : (
                  <section className="ue-panel">
                    <h3 className="text-sm font-semibold text-[#e6e8eb]">
                      Submitted Request
                    </h3>
                    <p className="mt-2 text-sm text-[#747b88]">
                      提交需求后，这里会显示本次生成配置。
                    </p>
                  </section>
                )}
                {heroGenerateError && activeView === "generate" ? (
                  <ErrorPanel
                    message={heroGenerateError}
                    onRetry={lastRequest ? handleRetryGenerate : undefined}
                  />
                ) : null}
              </div>
            </div>
          </section>

          <section className={viewClass("blueprint")} aria-label="Hero Blueprint">
            <div className="view-header flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="view-title">Hero Blueprint</h2>
                <p className="view-description">
                  查看英雄定位、背景、技能循环和完整平衡性说明。
                </p>
              </div>
              {!heroDesign && !isGeneratingHero ? (
                <button
                  className="ue-button"
                  type="button"
                  onClick={() => setActiveView("generate")}
                >
                  Go to Generate
                </button>
              ) : null}
            </div>
            {heroGenerateError && activeView === "blueprint" ? (
              <ErrorPanel
                message={heroGenerateError}
                onRetry={lastRequest ? handleRetryGenerate : undefined}
              />
            ) : (
              <>
                <HeroResultPanel
                  headerAside={heroDesign ? playableDemoPanel : null}
                  hero={heroDesign}
                  isLoading={isGeneratingHero}
                />
              </>
            )}
          </section>

          <section className={viewClass("assets")} aria-label="Assets and VFX">
            <div className="view-header">
              <h2 className="view-title">Assets / VFX</h2>
              <p className="view-description">
                查看最终设计板、技能预览图、VFX 拆解和英文图像 Prompt。
              </p>
            </div>
            <VfxBreakdownPanel
              headerAside={vfxDesigns.length > 0 ? runtimeVfxPanel : null}
              vfxDesigns={vfxDesigns}
              isLoading={isGeneratingVfx}
              errorMessage={vfxGenerateError}
              onRetry={heroDesign && lastRequest ? handleRetryVfx : undefined}
              imagePrompts={imagePrompts}
              isImagePromptLoading={isGeneratingImagePrompts}
              imagePromptError={imagePromptError}
              onRetryImagePrompt={
                vfxDesigns.length > 0 && lastRequest
                  ? handleRetryImagePrompt
                  : undefined
              }
              imageResults={imageResults}
              isImageGenerating={isGeneratingImages}
              imageGenerateError={imageGenerateError}
              onRetryImages={
                imagePrompts.length > 0 && currentProjectId
                  ? handleRetryImages
                  : undefined
              }
              boardResult={boardResult}
              isBoardRendering={isRenderingBoard}
              boardRenderError={boardRenderError}
              onRetryBoard={
                currentProjectId &&
                heroDesign &&
                vfxDesigns.length > 0 &&
                imageResults.length > 0
                  ? handleRetryBoard
                  : undefined
              }
            />
            {vfxDesigns.length === 0 ? (
              <div className="mt-3">{runtimeVfxPanel}</div>
            ) : null}
          </section>

          <section className={viewClass("projects")} aria-label="Projects">
            <div className="view-header">
              <h2 className="view-title">Projects</h2>
              <p className="view-description">
                管理当前项目保存状态、历史记录、打开和删除项目。
              </p>
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
              <ProjectSaveStatus
                errorMessage={projectSaveError}
                onRetry={
                  projectSaveStatus === "failed"
                    ? handleRetrySaveProject
                    : undefined
                }
                savedAt={savedProject?.updated_at}
                status={projectSaveStatus}
              />
              <ProjectHistoryPanel
                activeProjectId={activeProjectId}
                errorMessage={historyError}
                isLoading={isLoadingHistory}
                onDelete={(projectId) => void handleDeleteHistoryProject(projectId)}
                onOpen={(projectId) => void handleOpenProject(projectId)}
                onRefresh={() => void loadHistoryProjects()}
                projects={historyProjects}
              />
            </div>
          </section>

          <section className={viewClass("export")} aria-label="Export Package">
            <div className="view-header">
              <h2 className="view-title">Export Package</h2>
              <p className="view-description">
                选择资料包内容并下载 ZIP，用于交付策划文档、技能图和设计板。
              </p>
            </div>
            <div className="max-w-xl">
              <ProjectExportPanel
                errorMessage={exportError}
                exportResult={exportResult}
                hasPlayableSpec={Boolean(playableSpec)}
                hasRuntimeVfxAssetSpec={Boolean(activeRuntimeVfxAssetSpec)}
                onDownload={() => void handleDownloadExport()}
                onExport={(options) => void handleExportProject(options)}
                onGoToPlayableSpec={() => setActiveView("blueprint")}
                projectId={activeProjectId}
                status={exportStatus}
              />
            </div>
          </section>

          <section className={viewClass("playtest")} aria-label="Playtest">
            {activeView === "playtest" ? (
              <PlaytestView
                playableSpec={playableSpec}
                playableSpecSource={playableSpec ? "current_project" : "default"}
                runtimeVfxAssetSpec={activeRuntimeVfxAssetSpec}
              />
            ) : null}
          </section>
        </main>
      </div>

      <footer className="editor-status-bar">
        <div className="flex min-w-0 items-center gap-4">
          <span>{statusText}</span>
          <span className="hidden truncate sm:inline">
            Project: {currentProjectId ?? "None"}
          </span>
          <span className="hidden md:inline">
            Save: {projectSaveStatus}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            Backend: {backendStatus === "connected" ? "Connected" : backendStatus}
          </span>
          <span>v0.1.0</span>
        </div>
      </footer>
    </main>
  );
}

function SubmittedRequestPreview({
  request,
}: {
  request: HeroGenerateRequest;
}) {
  const rows = [
    ["游戏类型", request.game_type],
    ["英雄定位", request.hero_role],
    ["元素主题", request.element_theme],
    ["美术风格", request.art_style],
    ["技能数量", String(request.skill_count)],
    ["生成特效图", request.generate_images ? "是" : "否"],
    ["生成设计板", request.generate_board ? "是" : "否"],
  ];

  return (
    <aside
      aria-labelledby="submitted-request-preview-title"
      className="rounded-2xl border border-slate-400/15 bg-slate-900/70 p-5 shadow-lg shadow-black/20 backdrop-blur"
    >
      <h3
        className="text-base font-semibold text-slate-100"
        id="submitted-request-preview-title"
      >
        已提交的需求预览
      </h3>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-400/10 bg-slate-800/55 p-3">
            <dt className="text-slate-400">{label}</dt>
            <dd className="mt-1 font-medium text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 rounded-xl border border-slate-400/10 bg-slate-800/55 p-3 text-sm">
        <p className="text-slate-400">核心玩法</p>
        <p className="mt-1 leading-6 text-slate-100">{request.core_gameplay}</p>
      </div>
    </aside>
  );
}

export default HomePage;

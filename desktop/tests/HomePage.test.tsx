import { render, screen, waitFor } from "@testing-library/react";
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
import { generateVfxBreakdownBatch } from "../src/api/vfxApi";
import HomePage from "../src/pages/HomePage";

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

describe("HomePage", () => {
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
    mockedSaveProject.mockReset();
    mockedListProjects.mockResolvedValue({ projects: [], total: 0 });
    mockedGetProject.mockReset();
    mockedDeleteProject.mockReset();
    mockedGeneratePlayableSpec.mockReset();
  });

  it("renders the desktop shell", async () => {
    render(<HomePage />);

    expect(screen.getByText("AI Hero Design Editor")).toBeInTheDocument();
    await waitFor(() => expect(mockedCheckBackendHealth).toHaveBeenCalled());
  });

  it("loads project history on startup", async () => {
    render(<HomePage />);

    await waitFor(() => expect(mockedListProjects).toHaveBeenCalled());
  });

  it("does not start generation APIs on initial render", () => {
    render(<HomePage />);

    expect(mockedGenerateHeroDesign).not.toHaveBeenCalled();
    expect(mockedGenerateVfxBreakdownBatch).not.toHaveBeenCalled();
    expect(mockedGenerateImagePromptBatch).not.toHaveBeenCalled();
    expect(mockedGenerateImage).not.toHaveBeenCalled();
    expect(mockedRenderVfxBoard).not.toHaveBeenCalled();
  });
});

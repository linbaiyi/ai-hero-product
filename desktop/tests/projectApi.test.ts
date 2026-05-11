import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteProject,
  getProject,
  listProjects,
  saveProject,
} from "../src/api/projectApi";
import { projectRecord, projectSummary } from "./projectTestData";

const fetchMock = vi.fn();

describe("projectApi", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("saveProject posts to /api/projects/save with project data", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => projectRecord,
    });

    await expect(saveProject(projectRecord)).resolves.toEqual(projectRecord);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects/save"),
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.project_id).toBe("desktop_123");
    expect(body.hero_design.hero_name).toBe("焚烬法皇");
    expect(body.board_result.file_name).toBe("vfx_board.png");
  });

  it("listProjects requests /api/projects", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ projects: [projectSummary], total: 1 }),
    });

    await expect(listProjects()).resolves.toEqual({
      projects: [projectSummary],
      total: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/projects$/),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("getProject requests /api/projects/{project_id}", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => projectRecord,
    });

    await expect(getProject("desktop_123")).resolves.toEqual(projectRecord);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects/desktop_123"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("deleteProject requests /api/projects/{project_id}", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ project_id: "desktop_123", deleted: true }),
    });

    await expect(deleteProject("desktop_123")).resolves.toEqual({
      project_id: "desktop_123",
      deleted: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects/desktop_123"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws not found message for 404", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(getProject("missing")).rejects.toThrow(
      "项目不存在或已被删除。",
    );
  });

  it("throws Chinese connection error when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(listProjects()).rejects.toThrow(
      "无法连接本地后端服务，请确认 FastAPI 后端已启动。",
    );
  });
});

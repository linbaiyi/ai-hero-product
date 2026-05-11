import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadProjectExport,
  exportProject,
  saveProjectExportZip,
} from "../src/api/exportApi";

const fetchMock = vi.fn();

const request = {
  include_json: true,
  include_markdown: true,
  include_images: true,
  include_board: true,
};

const result = {
  project_id: "desktop 123",
  export_path: "outputs/exports/desktop_123/desktop_123_export.zip",
  file_name: "desktop_123_export.zip",
  success: true,
  error_message: null,
};

describe("exportApi", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    window.electronAPI = {
      saveZipFile: vi.fn().mockResolvedValue({
        canceled: false,
        filePath: "C:\\exports\\desktop_123_export.zip",
      }),
    };
  });

  it("exportProject posts to encoded export endpoint with options", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => result,
    });

    await expect(exportProject("desktop 123", request)).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects/desktop%20123/export"),
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual(request);
  });

  it("throws Chinese connection error when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(exportProject("desktop_123", request)).rejects.toThrow(
      "无法连接项目导出服务，请确认后端已启动。",
    );
  });

  it("throws Chinese error when response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(exportProject("desktop_123", request)).rejects.toThrow(
      "项目导出失败，请稍后重试。",
    );
  });

  it("throws result error when success=false", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...result,
        success: false,
        error_message: "磁盘空间不足",
      }),
    });

    await expect(exportProject("desktop_123", request)).rejects.toThrow(
      "磁盘空间不足",
    );
  });

  it("builds encoded download URL without requesting", () => {
    const url = downloadProjectExport("desktop 123");

    expect(url).toContain("/api/projects/desktop%20123/export/download");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches download data and saves zip through Electron API", async () => {
    const buffer = new ArrayBuffer(4);
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => buffer,
    });

    await expect(
      saveProjectExportZip("desktop 123", "desktop_123_export.zip"),
    ).resolves.toEqual({
      canceled: false,
      filePath: "C:\\exports\\desktop_123_export.zip",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects/desktop%20123/export/download"),
    );
    expect(window.electronAPI?.saveZipFile).toHaveBeenCalledWith({
      defaultPath: "desktop_123_export.zip",
      data: buffer,
    });
  });
});

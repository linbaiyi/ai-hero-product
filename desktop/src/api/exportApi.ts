import type {
  ExportProjectRequest,
  ExportProjectResult,
} from "../types/project";

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

const CONNECTION_ERROR = "无法连接项目导出服务，请确认后端已启动。";
const EXPORT_ERROR = "项目导出失败，请稍后重试。";
const FAILED_RESULT_ERROR = "项目导出失败。";

class ExportApiError extends Error {}

export async function exportProject(
  projectId: string,
  request: ExportProjectRequest,
): Promise<ExportProjectResult> {
  try {
    const response = await fetch(
      `${BACKEND_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/export`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      throw new ExportApiError(EXPORT_ERROR);
    }

    const result = (await response.json()) as ExportProjectResult;
    if (!result.success) {
      throw new ExportApiError(result.error_message || FAILED_RESULT_ERROR);
    }

    return result;
  } catch (error) {
    if (error instanceof ExportApiError) {
      throw error;
    }

    throw new Error(CONNECTION_ERROR);
  }
}

export function downloadProjectExport(projectId: string): string {
  return `${BACKEND_BASE_URL}/api/projects/${encodeURIComponent(
    projectId,
  )}/export/download`;
}

export type SaveZipResult = {
  canceled: boolean;
  filePath?: string;
};

export async function saveProjectExportZip(
  projectId: string,
  defaultPath?: string,
): Promise<SaveZipResult> {
  const url = downloadProjectExport(projectId);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(EXPORT_ERROR);
  }

  const data = await response.arrayBuffer();

  if (window.electronAPI?.saveZipFile) {
    return window.electronAPI.saveZipFile({
      defaultPath: defaultPath || `${projectId}_export.zip`,
      data,
    });
  }

  downloadArrayBufferInBrowser(data, defaultPath || `${projectId}_export.zip`);
  return { canceled: false };
}

function downloadArrayBufferInBrowser(data: ArrayBuffer, fileName: string) {
  const blob = new Blob([data], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

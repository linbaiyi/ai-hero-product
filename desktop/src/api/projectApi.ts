import type {
  ProjectListResponse,
  ProjectRecord,
  ProjectSaveRequest,
} from "../types/project";

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000";

const CONNECTION_ERROR =
  "无法连接本地后端服务，请确认 FastAPI 后端已启动。";
const SAVE_ERROR = "项目保存失败，请稍后重试。";
const LIST_ERROR = "历史项目加载失败，请稍后重试。";
const NOT_FOUND_ERROR = "项目不存在或已被删除。";
const DELETE_ERROR = "项目删除失败，请稍后重试。";

class ProjectApiError extends Error {}

async function requestJson<T>(
  url: string,
  options: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (response.status === 404) {
      throw new ProjectApiError(NOT_FOUND_ERROR);
    }

    if (!response.ok) {
      throw new ProjectApiError(fallbackMessage);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ProjectApiError) {
      throw error;
    }

    throw new Error(CONNECTION_ERROR);
  }
}

export function saveProject(
  request: ProjectSaveRequest,
): Promise<ProjectRecord> {
  return requestJson<ProjectRecord>(
    `${BACKEND_BASE_URL}/api/projects/save`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
    SAVE_ERROR,
  );
}

export function listProjects(): Promise<ProjectListResponse> {
  return requestJson<ProjectListResponse>(
    `${BACKEND_BASE_URL}/api/projects`,
    {
      method: "GET",
    },
    LIST_ERROR,
  );
}

export function getProject(projectId: string): Promise<ProjectRecord> {
  return requestJson<ProjectRecord>(
    `${BACKEND_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`,
    {
      method: "GET",
    },
    NOT_FOUND_ERROR,
  );
}

export function deleteProject(
  projectId: string,
): Promise<{ project_id: string; deleted: boolean }> {
  return requestJson<{ project_id: string; deleted: boolean }>(
    `${BACKEND_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`,
    {
      method: "DELETE",
    },
    DELETE_ERROR,
  );
}

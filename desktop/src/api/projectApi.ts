import type {
  ProjectImportResult,
  ProjectListResponse,
  ProjectRecord,
  ProjectSaveRequest,
  ProjectSkillEditRequest,
  ProjectSkillEditResult,
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
      let serverMessage: string | undefined;
      try {
        const errorBody = await response.json();
        const detail = errorBody?.detail;
        serverMessage =
          typeof detail?.message === "string"
            ? detail.message
            : typeof detail === "string"
              ? detail
              : typeof errorBody?.message === "string"
                ? errorBody.message
                : undefined;
      } catch {
        serverMessage = undefined;
      }
      throw new ProjectApiError(serverMessage ?? fallbackMessage);
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

export function importProjectArchive(file: File): Promise<ProjectImportResult> {
  return requestJson<ProjectImportResult>(
    `${BACKEND_BASE_URL}/api/projects/import`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/zip",
      },
      body: file,
    },
    "Project import failed. Please check the ZIP package and try again.",
  );
}

export function updateProjectSkill(
  projectId: string,
  slot: string,
  request: ProjectSkillEditRequest,
): Promise<ProjectSkillEditResult> {
  return requestJson<ProjectSkillEditResult>(
    `${BACKEND_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/skills/${encodeURIComponent(slot)}/edit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
    "Skill edit failed. Please retry after checking the current project.",
  );
}

import { BACKEND_BASE_URL } from "./backendApi";
import type {
  ProviderConnectionTestResponse,
  ProviderConfigResponse,
  ProviderConfigUpdateRequest,
  ProviderModelListResponse,
  ProviderProbeRequest,
} from "../types/providerConfig";

const CONFIG_ERROR = "API 配置读取失败，请确认后端服务已启动。";
const SAVE_ERROR = "API 配置保存失败，请检查配置内容后重试。";

export async function getProviderConfig(): Promise<ProviderConfigResponse> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/api/provider-config`, {
      method: "GET",
    });
  } catch {
    throw new Error(CONFIG_ERROR);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, CONFIG_ERROR));
  }

  return (await response.json()) as ProviderConfigResponse;
}

export async function updateProviderConfig(
  request: ProviderConfigUpdateRequest,
): Promise<ProviderConfigResponse> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/api/provider-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error(SAVE_ERROR);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, SAVE_ERROR));
  }

  return (await response.json()) as ProviderConfigResponse;
}

export async function listProviderModels(
  request: ProviderProbeRequest,
): Promise<ProviderModelListResponse> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/api/provider-config/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("模型列表获取失败，请检查网络和 API 配置。");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "模型列表获取失败。"));
  }

  return (await response.json()) as ProviderModelListResponse;
}

export async function testProviderConnection(
  request: ProviderProbeRequest,
): Promise<ProviderConnectionTestResponse> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/api/provider-config/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("连接测试失败，请检查后端服务是否启动。");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "连接测试失败。"));
  }

  return (await response.json()) as ProviderConnectionTestResponse;
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as {
      detail?: string | { message?: string };
    };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    if (payload.detail?.message) {
      return payload.detail.message;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

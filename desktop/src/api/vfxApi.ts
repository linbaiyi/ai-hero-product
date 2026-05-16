import type { VfxBreakdownBatchRequest, VfxDesign } from "../types/project";
import { BACKEND_BASE_URL, readBackendErrorMessage } from "./backendApi";

const CONNECTION_ERROR = "无法连接技能特效拆解服务，请确认后端已启动。";
const BREAKDOWN_ERROR = "技能特效拆解失败，请稍后重试。";

export async function generateVfxBreakdownBatch(
  request: VfxBreakdownBatchRequest,
): Promise<VfxDesign[]> {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_BASE_URL}/api/vfx/breakdown-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error(CONNECTION_ERROR);
  }

  if (!response.ok) {
    throw new Error(await readBackendErrorMessage(response, BREAKDOWN_ERROR));
  }

  return (await response.json()) as VfxDesign[];
}

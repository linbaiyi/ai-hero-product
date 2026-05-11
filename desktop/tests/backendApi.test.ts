import { afterEach, describe, expect, it, vi } from "vitest";
import { checkBackendHealth } from "../src/api/backendApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checkBackendHealth", () => {
  it("returns backend health data when request succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          service: "ai-game-hero-designer-backend",
          version: "0.1.0",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkBackendHealth();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/health"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toEqual({
      status: "ok",
      service: "ai-game-hero-designer-backend",
      version: "0.1.0",
    });
  });

  it("throws a Chinese error when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(checkBackendHealth()).rejects.toThrow(
      "无法连接本地后端服务，请确认 FastAPI 后端已启动。",
    );
  });

  it("throws a Chinese error when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("error", { status: 500 })),
    );

    await expect(checkBackendHealth()).rejects.toThrow(
      "无法连接本地后端服务，请确认 FastAPI 后端已启动。",
    );
  });
});

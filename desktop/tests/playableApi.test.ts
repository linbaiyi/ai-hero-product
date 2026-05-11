import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generatePlayableSpec,
  validatePlayableSpecOnServer,
} from "../src/api/playableApi";
import { defaultPlayableSpec } from "../src/game-demo/specs/defaultPlayableSpec";

afterEach(() => {
  vi.unstubAllGlobals();
});

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("playableApi", () => {
  it("generatePlayableSpec calls the playable generate endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({ playable_spec: defaultPlayableSpec }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generatePlayableSpec({ hero_design: "hero design text" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/playable/generate"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      hero_design: "hero design text",
      style: "3d_training_demo",
      complexity: "mvp",
    });
  });

  it("generatePlayableSpec validates and normalizes the returned spec", async () => {
    const reversed = {
      ...defaultPlayableSpec,
      skills: [...defaultPlayableSpec.skills].reverse(),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ playable_spec: reversed })),
    );

    const spec = await generatePlayableSpec({ hero_design: "hero" });

    expect(spec.skills.map((skill) => skill.slot)).toEqual(["Q", "W", "E", "R"]);
  });

  it("generatePlayableSpec throws when backend returns invalid spec", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ playable_spec: { version: "2.0" } })),
    );

    await expect(generatePlayableSpec({ hero_design: "hero" })).rejects.toThrow(
      "试玩配置校验失败",
    );
  });

  it("generatePlayableSpec throws a clear error when request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(generatePlayableSpec({ hero_design: "hero" })).rejects.toThrow(
      "无法连接试玩配置生成服务",
    );
  });

  it("validatePlayableSpecOnServer posts to the validate endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ valid: true, errors: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await validatePlayableSpecOnServer({
      playable_spec: defaultPlayableSpec,
    });

    expect(result).toEqual({ valid: true, errors: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/playable/validate"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

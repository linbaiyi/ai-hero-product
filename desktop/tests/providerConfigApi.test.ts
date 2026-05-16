import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getProviderConfig,
  listProviderModels,
  testProviderConnection,
  updateProviderConfig,
} from "../src/api/providerConfigApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("provider config api", () => {
  it("loads provider config", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          llm: {
            provider: "fake",
            api_key_present: false,
            api_key_preview: "",
            base_url: "",
            model: "",
            request_timeout: 60,
            max_retries: 2,
          },
          image: {
            provider: "fake",
            api_key_present: false,
            api_key_preview: "",
            base_url: "",
            model: "",
            request_timeout: 180,
            max_retries: 3,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getProviderConfig();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/provider-config"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.llm.provider).toBe("fake");
  });

  it("saves provider config", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          llm: {
            provider: "openai",
            api_key_present: true,
            api_key_preview: "sk-a...1234",
            base_url: "",
            model: "gpt-4.1",
            request_timeout: 60,
            max_retries: 2,
          },
          image: {
            provider: "fake",
            api_key_present: false,
            api_key_preview: "",
            base_url: "",
            model: "",
            request_timeout: 180,
            max_retries: 3,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await updateProviderConfig({
      llm: {
        provider: "openai",
        api_key: "sk-api-key",
        base_url: "",
        model: "gpt-4.1",
        request_timeout: 60,
        max_retries: 2,
      },
      image: {
        provider: "fake",
        base_url: "",
        model: "",
        request_timeout: 180,
        max_retries: 3,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/provider-config"),
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("loads provider models", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ models: ["gpt-4.1"] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listProviderModels({
      kind: "llm",
      config: {
        provider: "openai",
        api_key: "sk-api-key",
        base_url: "",
        model: "",
        request_timeout: 60,
        max_retries: 2,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/provider-config/models"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.models).toEqual(["gpt-4.1"]);
  });

  it("tests provider connection", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, message: "ok", sample: "OK" }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await testProviderConnection({
      kind: "llm",
      config: {
        provider: "openai",
        api_key: "sk-api-key",
        base_url: "",
        model: "gpt-4.1",
        request_timeout: 60,
        max_retries: 2,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/provider-config/test"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.success).toBe(true);
  });
});

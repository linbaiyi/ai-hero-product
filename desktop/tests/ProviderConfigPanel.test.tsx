import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProviderConfig,
  listProviderModels,
  testProviderConnection,
  updateProviderConfig,
} from "../src/api/providerConfigApi";
import ProviderConfigPanel from "../src/components/ProviderConfigPanel";

vi.mock("../src/api/providerConfigApi", () => ({
  getProviderConfig: vi.fn(),
  listProviderModels: vi.fn(),
  testProviderConnection: vi.fn(),
  updateProviderConfig: vi.fn(),
}));

const mockedGetProviderConfig = vi.mocked(getProviderConfig);
const mockedListProviderModels = vi.mocked(listProviderModels);
const mockedTestProviderConnection = vi.mocked(testProviderConnection);
const mockedUpdateProviderConfig = vi.mocked(updateProviderConfig);

const fakeConfig = {
  llm: {
    provider: "fake" as const,
    api_key_present: false,
    api_key_preview: "",
    base_url: "",
    model: "",
    request_timeout: 60,
    max_retries: 2,
  },
  image: {
    provider: "fake" as const,
    api_key_present: false,
    api_key_preview: "",
    base_url: "",
    model: "",
    request_timeout: 180,
    max_retries: 3,
  },
};

describe("ProviderConfigPanel", () => {
  beforeEach(() => {
    mockedGetProviderConfig.mockResolvedValue(fakeConfig);
    mockedUpdateProviderConfig.mockResolvedValue({
      ...fakeConfig,
      llm: {
        ...fakeConfig.llm,
        provider: "openai",
        api_key_present: true,
        api_key_preview: "sk-a...1234",
        model: "gpt-4.1",
      },
    });
    mockedListProviderModels.mockResolvedValue({
      models: ["gpt-4.1", "gpt-4.1-mini"],
    });
    mockedTestProviderConnection.mockResolvedValue({
      success: true,
      message: "大语言模型连接成功。",
      sample: "OK",
    });
  });

  it("loads and renders provider sections", async () => {
    render(<ProviderConfigPanel />);

    expect(await screen.findByText("大语言模型 API")).toBeInTheDocument();
    expect(screen.getByText("生图 API")).toBeInTheDocument();
    expect(mockedGetProviderConfig).toHaveBeenCalled();
  });

  it("submits updated LLM settings", async () => {
    render(<ProviderConfigPanel />);

    await screen.findByText("大语言模型 API");
    fireEvent.change(screen.getAllByLabelText("Provider")[0], {
      target: { value: "openai" },
    });
    fireEvent.change(screen.getAllByLabelText("API Key")[0], {
      target: { value: "sk-api-key" },
    });
    fireEvent.change(screen.getAllByLabelText("Model")[0], {
      target: { value: "gpt-4.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存 API 配置" }));

    await waitFor(() => expect(mockedUpdateProviderConfig).toHaveBeenCalled());
    expect(mockedUpdateProviderConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        llm: expect.objectContaining({
          provider: "openai",
          api_key: "sk-api-key",
          model: "gpt-4.1",
        }),
      }),
    );
  });

  it("fetches models and tests a provider connection", async () => {
    render(<ProviderConfigPanel />);

    await screen.findByText("大语言模型 API");
    fireEvent.change(screen.getAllByLabelText("Provider")[0], {
      target: { value: "openai" },
    });
    fireEvent.change(screen.getAllByLabelText("API Key")[0], {
      target: { value: "sk-api-key" },
    });
    fireEvent.change(screen.getAllByLabelText("Model")[0], {
      target: { value: "gpt-4.1" },
    });

    fireEvent.click(screen.getAllByRole("button", { name: "获取模型列表" })[0]);
    await waitFor(() => expect(mockedListProviderModels).toHaveBeenCalled());
    expect(await screen.findByLabelText("llm model list")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("llm model list"), {
      target: { value: "gpt-4.1-mini" },
    });
    expect(screen.getByLabelText("llm model list")).toHaveValue("gpt-4.1-mini");

    fireEvent.click(screen.getAllByRole("button", { name: "测试连接" })[0]);
    await waitFor(() => expect(mockedTestProviderConnection).toHaveBeenCalled());
  });
});

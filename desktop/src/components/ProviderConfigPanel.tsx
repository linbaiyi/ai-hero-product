import { useEffect, useState } from "react";
import {
  getProviderConfig,
  listProviderModels,
  testProviderConnection,
  updateProviderConfig,
} from "../api/providerConfigApi";
import type {
  ProviderConfigResponse,
  ProviderKind,
  ProviderName,
  ProviderRuntimeConfig,
  ProviderUpdatePayload,
} from "../types/providerConfig";

type LoadStatus = "idle" | "loading" | "ready" | "saving" | "saved" | "error";
type ProbeStatus = "idle" | "loading" | "success" | "error";

type ProviderFormState = {
  provider: ProviderName;
  api_key: string;
  clear_key: boolean;
  base_url: string;
  model: string;
  request_timeout: number;
  max_retries: number;
  api_key_present: boolean;
  api_key_preview: string;
};

type ProviderProbeState = {
  models: string[];
  modelStatus: ProbeStatus;
  testStatus: ProbeStatus;
  message: string;
};

const emptyProviderForm: ProviderFormState = {
  provider: "fake",
  api_key: "",
  clear_key: false,
  base_url: "",
  model: "",
  request_timeout: 60,
  max_retries: 2,
  api_key_present: false,
  api_key_preview: "",
};

const emptyProbeState: ProviderProbeState = {
  models: [],
  modelStatus: "idle",
  testStatus: "idle",
  message: "",
};

function ProviderConfigPanel() {
  const [llm, setLlm] = useState<ProviderFormState>(emptyProviderForm);
  const [image, setImage] = useState<ProviderFormState>({
    ...emptyProviderForm,
    request_timeout: 180,
    max_retries: 3,
  });
  const [llmProbe, setLlmProbe] = useState<ProviderProbeState>(emptyProbeState);
  const [imageProbe, setImageProbe] =
    useState<ProviderProbeState>(emptyProbeState);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const loadConfig = async () => {
    setStatus("loading");
    setMessage(null);

    try {
      applyConfigToForm(await getProviderConfig());
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "API 配置读取失败。");
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  useEffect(() => {
    if (!canFetchModels(llm)) {
      setLlmProbe((current) => ({ ...current, models: [], modelStatus: "idle" }));
      return;
    }

    const timer = window.setTimeout(() => {
      void handleFetchModels("llm");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [llm.provider, llm.api_key, llm.api_key_present, llm.clear_key, llm.base_url]);

  useEffect(() => {
    if (!canFetchModels(image)) {
      setImageProbe((current) => ({ ...current, models: [], modelStatus: "idle" }));
      return;
    }

    const timer = window.setTimeout(() => {
      void handleFetchModels("image");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    image.provider,
    image.api_key,
    image.api_key_present,
    image.clear_key,
    image.base_url,
  ]);

  const applyConfigToForm = (config: ProviderConfigResponse) => {
    setLlm(toFormState(config.llm));
    setImage(toFormState(config.image));
  };

  const handleFetchModels = async (kind: ProviderKind) => {
    const value = kind === "llm" ? llm : image;
    const setProbe = kind === "llm" ? setLlmProbe : setImageProbe;

    setProbe((current) => ({
      ...current,
      modelStatus: "loading",
      message: "正在获取模型列表...",
    }));

    try {
      const response = await listProviderModels({
        kind,
        config: toUpdatePayload(value),
      });
      setProbe((current) => ({
        ...current,
        models: response.models,
        modelStatus: "success",
        message: response.models.length
          ? `已获取 ${response.models.length} 个模型。`
          : "接口可用，但没有返回模型。",
      }));
    } catch (error) {
      setProbe((current) => ({
        ...current,
        models: [],
        modelStatus: "error",
        message: error instanceof Error ? error.message : "模型列表获取失败。",
      }));
    }
  };

  const handleTestConnection = async (kind: ProviderKind) => {
    const value = kind === "llm" ? llm : image;
    const setProbe = kind === "llm" ? setLlmProbe : setImageProbe;

    setProbe((current) => ({
      ...current,
      testStatus: "loading",
      message: kind === "image" ? "正在测试生图连接，会消耗一次生图额度..." : "正在测试大模型连接...",
    }));

    try {
      const response = await testProviderConnection({
        kind,
        config: toUpdatePayload(value),
      });
      setProbe((current) => ({
        ...current,
        testStatus: "success",
        message: response.sample
          ? `${response.message} 返回：${response.sample}`
          : response.message,
      }));
    } catch (error) {
      setProbe((current) => ({
        ...current,
        testStatus: "error",
        message: error instanceof Error ? error.message : "连接测试失败。",
      }));
    }
  };

  const handleSave = async () => {
    setStatus("saving");
    setMessage(null);

    try {
      const savedConfig = await updateProviderConfig({
        llm: toUpdatePayload(llm),
        image: toUpdatePayload(image),
      });
      applyConfigToForm(savedConfig);
      setStatus("saved");
      setMessage("API 配置已保存，后续生成会直接使用新配置。");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "API 配置保存失败。");
    }
  };

  const isBusy = status === "loading" || status === "saving";

  return (
    <section className="api-config-panel">
      <div className="view-header">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="view-title">API 配置</h2>
            <p className="view-description">
              配置大语言模型 API 和生图 API。粘贴 Key 后会自动获取模型列表，也可以手动测试连接。
            </p>
          </div>
          <button
            className="ue-button"
            disabled={isBusy}
            onClick={() => void loadConfig()}
            type="button"
          >
            重新读取
          </button>
        </div>
      </div>

      <div className="api-config-grid">
        <ProviderConfigCard
          description="用于英雄方案、技能拆解、Prompt 和 playable 配置生成。"
          disabled={isBusy}
          kind="llm"
          onChange={setLlm}
          onFetchModels={() => void handleFetchModels("llm")}
          onTestConnection={() => void handleTestConnection("llm")}
          probe={llmProbe}
          title="大语言模型 API"
          value={llm}
        />
        <ProviderConfigCard
          description="用于技能图、VFX 缩略图和运行时贴图资产生成。"
          disabled={isBusy}
          kind="image"
          onChange={setImage}
          onFetchModels={() => void handleFetchModels("image")}
          onTestConnection={() => void handleTestConnection("image")}
          probe={imageProbe}
          title="生图 API"
          value={image}
        />
      </div>

      <div className="api-config-actions">
        <div className="min-w-0">
          {message ? (
            <p
              className={`text-sm ${
                status === "error" ? "text-rose-200" : "text-emerald-200"
              }`}
            >
              {message}
            </p>
          ) : (
            <p className="text-sm text-[#747b88]">
              fake 模式不需要密钥；openai_compatible 的 Base URL 请填写到 /v1。生图连接测试会真实消耗一次生图额度。
            </p>
          )}
        </div>
        <button
          className="ue-button-primary"
          disabled={isBusy}
          onClick={() => void handleSave()}
          type="button"
        >
          {status === "saving" ? "正在保存..." : "保存 API 配置"}
        </button>
      </div>
    </section>
  );
}

function ProviderConfigCard({
  description,
  disabled,
  kind,
  onChange,
  onFetchModels,
  onTestConnection,
  probe,
  title,
  value,
}: {
  description: string;
  disabled: boolean;
  kind: ProviderKind;
  onChange: (value: ProviderFormState) => void;
  onFetchModels: () => void;
  onTestConnection: () => void;
  probe: ProviderProbeState;
  title: string;
  value: ProviderFormState;
}) {
  const update = (patch: Partial<ProviderFormState>) =>
    onChange({ ...value, ...patch });
  const keyHint = value.api_key_present
    ? `已保存：${value.api_key_preview}`
    : "尚未保存密钥";
  const canProbe = canFetchModels(value);
  const canTest = value.provider === "fake" || (canProbe && Boolean(value.model));
  const modelListId = `${kind}-provider-models`;

  return (
    <article className="api-config-card">
      <div>
        <h3 className="text-base font-semibold text-[#e6e8eb]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[#747b88]">{description}</p>
      </div>

      <label className="api-config-field">
        <span>Provider</span>
        <select
          className="ue-field"
          disabled={disabled}
          onChange={(event) =>
            update({ provider: event.target.value as ProviderName })
          }
          value={value.provider}
        >
          <option value="fake">fake</option>
          <option value="openai">openai</option>
          <option value="openai_compatible">openai_compatible</option>
        </select>
      </label>

      <label className="api-config-field">
        <span>API Key</span>
        <input
          autoComplete="off"
          className="ue-field"
          disabled={disabled || value.clear_key}
          onChange={(event) =>
            update({ api_key: event.target.value, clear_key: false })
          }
          placeholder={keyHint}
          type="password"
          value={value.api_key}
        />
      </label>

      <label className="api-config-check-row">
        <input
          checked={value.clear_key}
          disabled={disabled}
          onChange={(event) =>
            update({
              clear_key: event.target.checked,
              api_key: event.target.checked ? "" : value.api_key,
            })
          }
          type="checkbox"
        />
        <span>保存时清空当前密钥</span>
      </label>

      <label className="api-config-field">
        <span>Base URL</span>
        <input
          className="ue-field"
          disabled={disabled}
          onChange={(event) => update({ base_url: event.target.value })}
          placeholder="https://your-provider.example/v1"
          type="url"
          value={value.base_url}
        />
      </label>

      <label className="api-config-field">
        <span>Model</span>
        <input
          className="ue-field"
          disabled={disabled || value.provider === "fake"}
          list={modelListId}
          onChange={(event) => update({ model: event.target.value })}
          placeholder={value.provider === "fake" ? "fake 模式无需模型名" : "选择或输入模型名"}
          type="text"
          value={value.model}
        />
        <datalist id={modelListId}>
          {probe.models.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
        {probe.models.length > 0 ? (
          <div className="api-config-model-picker">
            <select
              aria-label={`${kind} model list`}
              className="ue-field"
              disabled={disabled || value.provider === "fake"}
              onChange={(event) => update({ model: event.target.value })}
              value={probe.models.includes(value.model) ? value.model : ""}
            >
              <option value="">从已获取列表选择模型</option>
              {probe.models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <span>已获取 {probe.models.length} 个模型</span>
          </div>
        ) : null}
      </label>

      <div className="api-config-button-row">
        <button
          className="ue-button"
          disabled={disabled || !canProbe || probe.modelStatus === "loading"}
          onClick={onFetchModels}
          type="button"
        >
          {probe.modelStatus === "loading" ? "获取中..." : "获取模型列表"}
        </button>
        <button
          className="ue-button"
          disabled={disabled || !canTest || probe.testStatus === "loading"}
          onClick={onTestConnection}
          type="button"
        >
          {probe.testStatus === "loading" ? "测试中..." : "测试连接"}
        </button>
      </div>

      {probe.message ? (
        <p
          className={`api-config-probe-message ${
            probe.modelStatus === "error" || probe.testStatus === "error"
              ? "text-rose-200"
              : "text-[#aeb4bf]"
          }`}
        >
          {probe.message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="api-config-field">
          <span>Timeout 秒</span>
          <input
            className="ue-field"
            disabled={disabled}
            max={600}
            min={1}
            onChange={(event) =>
              update({ request_timeout: Number(event.target.value) })
            }
            type="number"
            value={value.request_timeout}
          />
        </label>
        <label className="api-config-field">
          <span>重试次数</span>
          <input
            className="ue-field"
            disabled={disabled}
            max={10}
            min={0}
            onChange={(event) => update({ max_retries: Number(event.target.value) })}
            type="number"
            value={value.max_retries}
          />
        </label>
      </div>
    </article>
  );
}

function toFormState(config: ProviderRuntimeConfig): ProviderFormState {
  return {
    provider: config.provider,
    api_key: "",
    clear_key: false,
    base_url: config.base_url,
    model: config.model,
    request_timeout: config.request_timeout,
    max_retries: config.max_retries,
    api_key_present: config.api_key_present,
    api_key_preview: config.api_key_preview,
  };
}

function toUpdatePayload(form: ProviderFormState): ProviderUpdatePayload {
  return {
    provider: form.provider,
    api_key: form.clear_key
      ? ""
      : form.api_key.trim()
        ? form.api_key
        : undefined,
    base_url: form.base_url.trim(),
    model: form.model.trim(),
    request_timeout: form.request_timeout,
    max_retries: form.max_retries,
  };
}

function canFetchModels(form: ProviderFormState): boolean {
  if (form.provider === "fake") {
    return true;
  }
  if (form.clear_key) {
    return false;
  }
  const hasKey = Boolean(form.api_key.trim()) || form.api_key_present;
  if (!hasKey) {
    return false;
  }
  return form.provider !== "openai_compatible" || Boolean(form.base_url.trim());
}

export default ProviderConfigPanel;

export type ProviderName = "fake" | "openai" | "openai_compatible";

export type ProviderRuntimeConfig = {
  provider: ProviderName;
  api_key_present: boolean;
  api_key_preview: string;
  base_url: string;
  model: string;
  request_timeout: number;
  max_retries: number;
};

export type ProviderConfigResponse = {
  llm: ProviderRuntimeConfig;
  image: ProviderRuntimeConfig;
};

export type ProviderUpdatePayload = {
  provider: ProviderName;
  api_key?: string | null;
  base_url: string;
  model: string;
  request_timeout: number;
  max_retries: number;
};

export type ProviderConfigUpdateRequest = {
  llm: ProviderUpdatePayload;
  image: ProviderUpdatePayload;
};

export type ProviderKind = "llm" | "image";

export type ProviderProbeRequest = {
  kind: ProviderKind;
  config: ProviderUpdatePayload;
};

export type ProviderModelListResponse = {
  models: string[];
};

export type ProviderConnectionTestResponse = {
  success: boolean;
  message: string;
  sample: string;
};

from typing import Literal

from pydantic import BaseModel, Field


ProviderName = Literal["fake", "openai", "openai_compatible"]
ProviderKind = Literal["llm", "image"]


class ProviderRuntimeConfig(BaseModel):
    provider: ProviderName = "fake"
    api_key_present: bool = False
    api_key_preview: str = ""
    base_url: str = ""
    model: str = ""
    request_timeout: int = Field(default=60, ge=1, le=600)
    max_retries: int = Field(default=2, ge=0, le=10)


class ProviderConfigResponse(BaseModel):
    llm: ProviderRuntimeConfig
    image: ProviderRuntimeConfig


class ProviderUpdatePayload(BaseModel):
    provider: ProviderName
    api_key: str | None = None
    base_url: str = ""
    model: str = ""
    request_timeout: int = Field(default=60, ge=1, le=600)
    max_retries: int = Field(default=2, ge=0, le=10)


class ProviderConfigUpdateRequest(BaseModel):
    llm: ProviderUpdatePayload
    image: ProviderUpdatePayload


class ProviderProbeRequest(BaseModel):
    kind: ProviderKind
    config: ProviderUpdatePayload


class ProviderModelListResponse(BaseModel):
    models: list[str]


class ProviderConnectionTestResponse(BaseModel):
    success: bool
    message: str
    sample: str = ""

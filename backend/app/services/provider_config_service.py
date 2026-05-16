import os
from pathlib import Path

from app.config import Settings, get_env_file_path, get_settings
from app.schemas.provider_config_schema import (
    ProviderConnectionTestResponse,
    ProviderConfigResponse,
    ProviderConfigUpdateRequest,
    ProviderModelListResponse,
    ProviderProbeRequest,
    ProviderRuntimeConfig,
    ProviderUpdatePayload,
)


CONFIG_KEYS = [
    "LLM_PROVIDER",
    "LLM_API_KEY",
    "LLM_BASE_URL",
    "LLM_TEXT_MODEL",
    "LLM_REQUEST_TIMEOUT",
    "LLM_MAX_RETRIES",
    "IMAGE_PROVIDER",
    "IMAGE_API_KEY",
    "IMAGE_BASE_URL",
    "IMAGE_MODEL",
    "IMAGE_REQUEST_TIMEOUT",
    "IMAGE_MAX_RETRIES",
]


def get_provider_config() -> ProviderConfigResponse:
    return _settings_to_response(get_settings())


def update_provider_config(
    request: ProviderConfigUpdateRequest,
) -> ProviderConfigResponse:
    env_updates = {
        "LLM_PROVIDER": request.llm.provider,
        "LLM_BASE_URL": request.llm.base_url,
        "LLM_TEXT_MODEL": request.llm.model,
        "LLM_REQUEST_TIMEOUT": str(request.llm.request_timeout),
        "LLM_MAX_RETRIES": str(request.llm.max_retries),
        "IMAGE_PROVIDER": request.image.provider,
        "IMAGE_BASE_URL": request.image.base_url,
        "IMAGE_MODEL": request.image.model,
        "IMAGE_REQUEST_TIMEOUT": str(request.image.request_timeout),
        "IMAGE_MAX_RETRIES": str(request.image.max_retries),
    }

    if request.llm.api_key is not None:
        env_updates["LLM_API_KEY"] = request.llm.api_key
    if request.image.api_key is not None:
        env_updates["IMAGE_API_KEY"] = request.image.api_key

    for key, value in env_updates.items():
        os.environ[key] = value

    _write_env_file(get_env_file_path(), env_updates)
    return _settings_to_response(get_settings())


def list_provider_models(request: ProviderProbeRequest) -> ProviderModelListResponse:
    if request.config.provider == "fake":
        if request.kind == "llm":
            return ProviderModelListResponse(models=["fake-hero-json-model"])
        return ProviderModelListResponse(models=["fake-vfx-image-model"])

    api_key = _resolve_api_key(request.kind, request.config)
    _validate_real_provider_config(request.config, api_key)
    client = _create_openai_client(request.config, api_key)

    try:
        response = client.models.list()
        models = sorted(
            {
                str(getattr(model, "id", ""))
                for model in getattr(response, "data", []) or []
                if getattr(model, "id", "")
            }
        )
    except Exception as exc:
        raise RuntimeError(f"模型列表获取失败：{exc}") from exc

    return ProviderModelListResponse(models=models)


def test_provider_connection(
    request: ProviderProbeRequest,
) -> ProviderConnectionTestResponse:
    if request.config.provider == "fake":
        return ProviderConnectionTestResponse(
            success=True,
            message="fake Provider 可用，不会消耗额度。",
            sample="fake-ok",
        )

    api_key = _resolve_api_key(request.kind, request.config)
    _validate_real_provider_config(request.config, api_key)
    if not request.config.model:
        raise ValueError("请先选择或填写模型名。")

    client = _create_openai_client(request.config, api_key)

    try:
        if request.kind == "llm":
            sample = _test_llm_connection(client, request.config)
            return ProviderConnectionTestResponse(
                success=True,
                message="大语言模型连接成功。",
                sample=sample,
            )

        sample = _test_image_connection(client, request.config)
        return ProviderConnectionTestResponse(
            success=True,
            message="生图 API 连接成功，已完成一次测试生图请求。",
            sample=sample,
        )
    except Exception as exc:
        raise RuntimeError(f"连接测试失败：{exc}") from exc


def _settings_to_response(settings: Settings) -> ProviderConfigResponse:
    return ProviderConfigResponse(
        llm=ProviderRuntimeConfig(
            provider=settings.llm_provider,  # type: ignore[arg-type]
            api_key_present=bool(settings.llm_api_key),
            api_key_preview=_preview_secret(settings.llm_api_key),
            base_url=settings.llm_base_url,
            model=settings.llm_text_model,
            request_timeout=settings.llm_request_timeout,
            max_retries=settings.llm_max_retries,
        ),
        image=ProviderRuntimeConfig(
            provider=settings.image_provider,  # type: ignore[arg-type]
            api_key_present=bool(settings.image_api_key),
            api_key_preview=_preview_secret(settings.image_api_key),
            base_url=settings.image_base_url,
            model=settings.image_model,
            request_timeout=settings.image_request_timeout,
            max_retries=settings.image_max_retries,
        ),
    )


def _resolve_api_key(kind: str, config: ProviderUpdatePayload) -> str:
    if config.api_key is not None:
        return config.api_key

    settings = get_settings()
    if kind == "llm":
        return settings.llm_api_key
    return settings.image_api_key


def _validate_real_provider_config(config: ProviderUpdatePayload, api_key: str) -> None:
    if not api_key:
        raise ValueError("API Key 未配置。")
    if config.provider == "openai_compatible" and not config.base_url:
        raise ValueError("openai_compatible 需要填写 Base URL，通常应填写到 /v1。")


def _create_openai_client(config: ProviderUpdatePayload, api_key: str):
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError("openai 依赖未安装，无法测试真实 API。") from exc

    kwargs = {
        "api_key": api_key,
        "timeout": config.request_timeout,
        "max_retries": config.max_retries,
    }
    if config.provider == "openai_compatible" or config.base_url:
        kwargs["base_url"] = config.base_url

    return OpenAI(**kwargs)


def _test_llm_connection(client, config: ProviderUpdatePayload) -> str:
    if config.provider == "openai_compatible":
        response = client.chat.completions.create(
            model=config.model,
            messages=[
                {
                    "role": "user",
                    "content": "Reply with exactly: OK",
                }
            ],
            max_tokens=8,
            temperature=0,
        )
        message = response.choices[0].message.content or ""
        return message.strip()

    response = client.responses.create(
        model=config.model,
        input="Reply with exactly: OK",
        max_output_tokens=16,
    )
    return str(getattr(response, "output_text", "")).strip()


def _test_image_connection(client, config: ProviderUpdatePayload) -> str:
    response = client.images.generate(
        model=config.model,
        prompt="A tiny red crystal icon on a plain dark background, no text.",
        size="1024x1024",
        n=1,
    )
    data = getattr(response, "data", None) or []
    if not data:
        raise ValueError("生图 API 返回为空。")

    item = data[0]
    if getattr(item, "url", None):
        return "image-url"
    if getattr(item, "b64_json", None):
        return "image-b64"
    return "image-generated"


def _preview_secret(secret: str) -> str:
    if not secret:
        return ""
    if len(secret) <= 8:
        return "****"
    return f"{secret[:4]}...{secret[-4:]}"


def _write_env_file(path: Path, updates: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    seen_keys: set[str] = set()
    rewritten: list[str] = []

    for line in lines:
        key = _read_env_key(line)
        if key in updates:
            rewritten.append(f"{key}={_format_env_value(updates[key])}")
            seen_keys.add(key)
        else:
            rewritten.append(line)

    missing_keys = [key for key in CONFIG_KEYS if key in updates and key not in seen_keys]
    if missing_keys and rewritten and rewritten[-1].strip():
        rewritten.append("")

    for key in missing_keys:
        rewritten.append(f"{key}={_format_env_value(updates[key])}")

    path.write_text("\n".join(rewritten).rstrip() + "\n", encoding="utf-8")


def _read_env_key(line: str) -> str | None:
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        return None
    return stripped.split("=", 1)[0].strip()


def _format_env_value(value: str) -> str:
    if value == "":
        return ""
    if any(character.isspace() for character in value) or "#" in value or '"' in value:
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    return value

from app.clients.api_llm_client import ApiLLMClient
from app.clients.fake_llm_client import FakeLLMClient
from app.clients.llm_client import LLMClient
from app.config import get_settings


def create_llm_client() -> LLMClient:
    settings = get_settings()
    provider = settings.llm_provider

    if provider == "fake":
        return FakeLLMClient()

    if provider == "openai":
        _validate_real_llm_common(settings.llm_api_key, settings.llm_text_model)
        return ApiLLMClient(
            provider="openai",
            api_key=settings.llm_api_key,
            model=settings.llm_text_model,
            base_url=None,
            timeout=settings.llm_request_timeout,
            max_retries=settings.llm_max_retries,
        )

    if provider == "openai_compatible":
        _validate_real_llm_common(settings.llm_api_key, settings.llm_text_model)
        if not settings.llm_base_url:
            raise ValueError("LLM_BASE_URL 未配置，无法使用 openai_compatible Provider。")
        return ApiLLMClient(
            provider="openai_compatible",
            api_key=settings.llm_api_key,
            model=settings.llm_text_model,
            base_url=settings.llm_base_url,
            timeout=settings.llm_request_timeout,
            max_retries=settings.llm_max_retries,
        )

    raise ValueError(f"不支持的 LLM_PROVIDER: {provider}")


def _validate_real_llm_common(api_key: str, model: str) -> None:
    if not api_key:
        raise ValueError("LLM_API_KEY 未配置，无法使用真实大模型 API。")
    if not model:
        raise ValueError("LLM_TEXT_MODEL 未配置，无法调用真实大模型。")

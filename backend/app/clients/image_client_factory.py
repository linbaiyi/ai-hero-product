from app.clients.api_image_client import ApiImageClient
from app.clients.fake_image_client import FakeImageClient
from app.clients.image_client import ImageClient
from app.config import get_settings


def create_image_client() -> ImageClient:
    settings = get_settings()
    provider = settings.image_provider

    if provider == "fake":
        return FakeImageClient()

    if provider == "openai":
        _validate_real_image_common(settings.image_api_key, settings.image_model)
        return ApiImageClient(
            provider="openai",
            api_key=settings.image_api_key,
            model=settings.image_model,
            base_url=None,
            timeout=settings.image_request_timeout,
            max_retries=settings.image_max_retries,
        )

    if provider == "openai_compatible":
        _validate_real_image_common(settings.image_api_key, settings.image_model)
        if not settings.image_base_url:
            raise ValueError(
                "IMAGE_BASE_URL 未配置，无法使用 openai_compatible Image Provider。"
            )
        return ApiImageClient(
            provider="openai_compatible",
            api_key=settings.image_api_key,
            model=settings.image_model,
            base_url=settings.image_base_url,
            timeout=settings.image_request_timeout,
            max_retries=settings.image_max_retries,
        )

    raise ValueError(f"不支持的 IMAGE_PROVIDER: {provider}")


def _validate_real_image_common(api_key: str, model: str) -> None:
    if not api_key:
        raise ValueError("IMAGE_API_KEY 未配置，无法使用真实图像生成 API。")
    if not model:
        raise ValueError("IMAGE_MODEL 未配置，无法调用真实图像生成模型。")

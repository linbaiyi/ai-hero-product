import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def get_env_file_path() -> Path:
    configured_path = os.getenv("APP_ENV_FILE")
    if configured_path:
        return Path(configured_path).resolve()

    return Path(__file__).resolve().parents[1] / ".env"


load_dotenv(dotenv_path=get_env_file_path())


def _parse_cors_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _parse_int(value: str | None, fallback: int) -> int:
    if value is None or value == "":
        return fallback
    return int(value)


@dataclass(frozen=True, repr=False)
class Settings:
    app_name: str = "AI Game Hero Designer Backend"
    app_version: str = "0.1.0"
    env: str = "development"
    cors_origins: list[str] | None = None
    llm_provider: str = "fake"
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_text_model: str = ""
    llm_request_timeout: int = 60
    llm_max_retries: int = 2
    image_provider: str = "fake"
    image_api_key: str = ""
    image_base_url: str = ""
    image_model: str = ""
    image_request_timeout: int = 120
    image_max_retries: int = 1
    image_default_width: int = 1024
    image_default_height: int = 1024
    image_output_format: str = "png"

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            app_name=os.getenv("APP_NAME", "AI Game Hero Designer Backend"),
            app_version=os.getenv("APP_VERSION", "0.1.0"),
            env=os.getenv("ENV", "development"),
            cors_origins=_parse_cors_origins(os.getenv("CORS_ORIGINS")),
            llm_provider=os.getenv("LLM_PROVIDER", "fake").strip().lower(),
            llm_api_key=os.getenv("LLM_API_KEY", ""),
            llm_base_url=os.getenv("LLM_BASE_URL", ""),
            llm_text_model=os.getenv("LLM_TEXT_MODEL", ""),
            llm_request_timeout=_parse_int(os.getenv("LLM_REQUEST_TIMEOUT"), 60),
            llm_max_retries=_parse_int(os.getenv("LLM_MAX_RETRIES"), 2),
            image_provider=os.getenv("IMAGE_PROVIDER", "fake").strip().lower(),
            image_api_key=os.getenv("IMAGE_API_KEY", ""),
            image_base_url=os.getenv("IMAGE_BASE_URL", ""),
            image_model=os.getenv("IMAGE_MODEL", ""),
            image_request_timeout=_parse_int(os.getenv("IMAGE_REQUEST_TIMEOUT"), 120),
            image_max_retries=_parse_int(os.getenv("IMAGE_MAX_RETRIES"), 1),
            image_default_width=_parse_int(os.getenv("IMAGE_DEFAULT_WIDTH"), 1024),
            image_default_height=_parse_int(os.getenv("IMAGE_DEFAULT_HEIGHT"), 1024),
            image_output_format=os.getenv("IMAGE_OUTPUT_FORMAT", "png"),
        )


def get_settings() -> Settings:
    return Settings.from_env()


settings = get_settings()

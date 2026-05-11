from app.config import Settings


def test_default_image_provider_is_fake(monkeypatch):
    monkeypatch.delenv("IMAGE_PROVIDER", raising=False)

    settings = Settings.from_env()

    assert settings.image_provider == "fake"


def test_reads_openai_image_provider(monkeypatch):
    monkeypatch.setenv("IMAGE_PROVIDER", "openai")

    settings = Settings.from_env()

    assert settings.image_provider == "openai"


def test_reads_openai_compatible_image_provider(monkeypatch):
    monkeypatch.setenv("IMAGE_PROVIDER", "openai_compatible")

    settings = Settings.from_env()

    assert settings.image_provider == "openai_compatible"


def test_reads_image_api_settings(monkeypatch):
    monkeypatch.setenv("IMAGE_API_KEY", "image-secret")
    monkeypatch.setenv("IMAGE_BASE_URL", "https://example.com/v1")
    monkeypatch.setenv("IMAGE_MODEL", "image-model")
    monkeypatch.setenv("IMAGE_REQUEST_TIMEOUT", "90")
    monkeypatch.setenv("IMAGE_MAX_RETRIES", "4")
    monkeypatch.setenv("IMAGE_DEFAULT_WIDTH", "768")
    monkeypatch.setenv("IMAGE_DEFAULT_HEIGHT", "768")
    monkeypatch.setenv("IMAGE_OUTPUT_FORMAT", "png")

    settings = Settings.from_env()

    assert settings.image_api_key == "image-secret"
    assert settings.image_base_url == "https://example.com/v1"
    assert settings.image_model == "image-model"
    assert settings.image_request_timeout == 90
    assert settings.image_max_retries == 4
    assert settings.image_default_width == 768
    assert settings.image_default_height == 768
    assert settings.image_output_format == "png"
    assert "image-secret" not in repr(settings)

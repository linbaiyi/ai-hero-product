from app.config import Settings


def test_default_llm_provider_is_fake(monkeypatch):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)

    settings = Settings.from_env()

    assert settings.llm_provider == "fake"


def test_reads_openai_provider(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai")

    settings = Settings.from_env()

    assert settings.llm_provider == "openai"


def test_reads_openai_compatible_provider(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai_compatible")

    settings = Settings.from_env()

    assert settings.llm_provider == "openai_compatible"


def test_reads_llm_api_settings(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "secret-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://example.com/v1")
    monkeypatch.setenv("LLM_TEXT_MODEL", "model-x")
    monkeypatch.setenv("LLM_REQUEST_TIMEOUT", "30")
    monkeypatch.setenv("LLM_MAX_RETRIES", "3")

    settings = Settings.from_env()

    assert settings.llm_api_key == "secret-key"
    assert settings.llm_base_url == "https://example.com/v1"
    assert settings.llm_text_model == "model-x"
    assert settings.llm_request_timeout == 30
    assert settings.llm_max_retries == 3
    assert "secret-key" not in repr(settings)

import pytest

from app.clients.api_llm_client import ApiLLMClient
from app.clients.fake_llm_client import FakeLLMClient
from app.clients.llm_client_factory import create_llm_client


def clear_llm_env(monkeypatch):
    for key in [
        "LLM_PROVIDER",
        "LLM_API_KEY",
        "LLM_BASE_URL",
        "LLM_TEXT_MODEL",
        "LLM_REQUEST_TIMEOUT",
        "LLM_MAX_RETRIES",
    ]:
        monkeypatch.delenv(key, raising=False)


def test_fake_provider_returns_fake_client(monkeypatch):
    clear_llm_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "fake")

    client = create_llm_client()

    assert isinstance(client, FakeLLMClient)


def test_openai_provider_returns_api_client(monkeypatch):
    clear_llm_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    monkeypatch.setenv("LLM_TEXT_MODEL", "model-x")

    client = create_llm_client()

    assert isinstance(client, ApiLLMClient)
    assert client.provider == "openai"
    assert client.base_url is None


def test_openai_compatible_provider_returns_api_client(monkeypatch):
    clear_llm_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "openai_compatible")
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://example.com/v1")
    monkeypatch.setenv("LLM_TEXT_MODEL", "model-x")

    client = create_llm_client()

    assert isinstance(client, ApiLLMClient)
    assert client.provider == "openai_compatible"
    assert client.base_url == "https://example.com/v1"


def test_openai_missing_api_key_raises_chinese_error(monkeypatch):
    clear_llm_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_TEXT_MODEL", "model-x")

    with pytest.raises(ValueError, match="LLM_API_KEY 未配置"):
        create_llm_client()


def test_openai_missing_model_raises_chinese_error(monkeypatch):
    clear_llm_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "test-key")

    with pytest.raises(ValueError, match="LLM_TEXT_MODEL 未配置"):
        create_llm_client()


def test_openai_compatible_missing_base_url_raises_chinese_error(monkeypatch):
    clear_llm_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "openai_compatible")
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    monkeypatch.setenv("LLM_TEXT_MODEL", "model-x")

    with pytest.raises(ValueError, match="LLM_BASE_URL 未配置"):
        create_llm_client()


def test_unknown_provider_raises_value_error(monkeypatch):
    clear_llm_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "unknown")

    with pytest.raises(ValueError, match="不支持的 LLM_PROVIDER"):
        create_llm_client()

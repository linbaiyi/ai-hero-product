import pytest

from app.clients.api_image_client import ApiImageClient
from app.clients.fake_image_client import FakeImageClient
from app.clients.image_client_factory import create_image_client


def clear_image_env(monkeypatch):
    for key in [
        "IMAGE_PROVIDER",
        "IMAGE_API_KEY",
        "IMAGE_BASE_URL",
        "IMAGE_MODEL",
        "IMAGE_REQUEST_TIMEOUT",
        "IMAGE_MAX_RETRIES",
    ]:
        monkeypatch.delenv(key, raising=False)


def test_fake_provider_returns_fake_image_client(monkeypatch):
    clear_image_env(monkeypatch)
    monkeypatch.setenv("IMAGE_PROVIDER", "fake")

    client = create_image_client()

    assert isinstance(client, FakeImageClient)


def test_openai_provider_returns_api_image_client(monkeypatch):
    clear_image_env(monkeypatch)
    monkeypatch.setenv("IMAGE_PROVIDER", "openai")
    monkeypatch.setenv("IMAGE_API_KEY", "test-key")
    monkeypatch.setenv("IMAGE_MODEL", "image-model")

    client = create_image_client()

    assert isinstance(client, ApiImageClient)
    assert client.provider == "openai"
    assert client.base_url is None


def test_openai_compatible_provider_returns_api_image_client(monkeypatch):
    clear_image_env(monkeypatch)
    monkeypatch.setenv("IMAGE_PROVIDER", "openai_compatible")
    monkeypatch.setenv("IMAGE_API_KEY", "test-key")
    monkeypatch.setenv("IMAGE_BASE_URL", "https://example.com/v1")
    monkeypatch.setenv("IMAGE_MODEL", "image-model")

    client = create_image_client()

    assert isinstance(client, ApiImageClient)
    assert client.provider == "openai_compatible"
    assert client.base_url == "https://example.com/v1"


def test_openai_compatible_provider_normalizes_full_endpoint_base_url(monkeypatch):
    clear_image_env(monkeypatch)
    monkeypatch.setenv("IMAGE_PROVIDER", "openai_compatible")
    monkeypatch.setenv("IMAGE_API_KEY", "test-key")
    monkeypatch.setenv("IMAGE_BASE_URL", "https://example.com/v1/images/generations")
    monkeypatch.setenv("IMAGE_MODEL", "image-model")

    client = create_image_client()

    assert isinstance(client, ApiImageClient)
    assert client.base_url == "https://example.com/v1"


def test_openai_missing_api_key_raises_chinese_error(monkeypatch):
    clear_image_env(monkeypatch)
    monkeypatch.setenv("IMAGE_PROVIDER", "openai")
    monkeypatch.setenv("IMAGE_MODEL", "image-model")

    with pytest.raises(ValueError, match="IMAGE_API_KEY 未配置"):
        create_image_client()


def test_openai_missing_model_raises_chinese_error(monkeypatch):
    clear_image_env(monkeypatch)
    monkeypatch.setenv("IMAGE_PROVIDER", "openai")
    monkeypatch.setenv("IMAGE_API_KEY", "test-key")

    with pytest.raises(ValueError, match="IMAGE_MODEL 未配置"):
        create_image_client()


def test_openai_compatible_missing_base_url_raises_chinese_error(monkeypatch):
    clear_image_env(monkeypatch)
    monkeypatch.setenv("IMAGE_PROVIDER", "openai_compatible")
    monkeypatch.setenv("IMAGE_API_KEY", "test-key")
    monkeypatch.setenv("IMAGE_MODEL", "image-model")

    with pytest.raises(ValueError, match="IMAGE_BASE_URL 未配置"):
        create_image_client()


def test_unknown_image_provider_raises_value_error(monkeypatch):
    clear_image_env(monkeypatch)
    monkeypatch.setenv("IMAGE_PROVIDER", "unknown")

    with pytest.raises(ValueError, match="不支持的 IMAGE_PROVIDER"):
        create_image_client()

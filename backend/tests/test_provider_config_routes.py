from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_provider_config_get_masks_api_keys(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai_compatible")
    monkeypatch.setenv("LLM_API_KEY", "llm-secret-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://llm.example/v1")
    monkeypatch.setenv("LLM_TEXT_MODEL", "chat-model")
    monkeypatch.setenv("IMAGE_PROVIDER", "openai")
    monkeypatch.setenv("IMAGE_API_KEY", "image-secret-key")
    monkeypatch.setenv("IMAGE_MODEL", "image-model")

    response = client.get("/api/provider-config")

    assert response.status_code == 200
    payload = response.json()
    assert payload["llm"]["provider"] == "openai_compatible"
    assert payload["llm"]["api_key_present"] is True
    assert payload["llm"]["api_key_preview"] == "llm-...-key"
    assert "llm-secret-key" not in response.text
    assert payload["image"]["provider"] == "openai"
    assert payload["image"]["api_key_present"] is True
    assert "image-secret-key" not in response.text


def test_provider_config_put_updates_runtime_env_and_env_file(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text("APP_NAME=test\nLLM_API_KEY=old-secret\n", encoding="utf-8")
    monkeypatch.setenv("APP_ENV_FILE", str(env_file))
    monkeypatch.setenv("LLM_PROVIDER", "fake")
    monkeypatch.setenv("LLM_API_KEY", "old-secret")
    monkeypatch.setenv("LLM_BASE_URL", "")
    monkeypatch.setenv("LLM_TEXT_MODEL", "")
    monkeypatch.setenv("LLM_REQUEST_TIMEOUT", "60")
    monkeypatch.setenv("LLM_MAX_RETRIES", "2")
    monkeypatch.setenv("IMAGE_PROVIDER", "fake")
    monkeypatch.setenv("IMAGE_API_KEY", "")
    monkeypatch.setenv("IMAGE_BASE_URL", "")
    monkeypatch.setenv("IMAGE_MODEL", "")
    monkeypatch.setenv("IMAGE_REQUEST_TIMEOUT", "180")
    monkeypatch.setenv("IMAGE_MAX_RETRIES", "3")

    response = client.put(
        "/api/provider-config",
        json={
            "llm": {
                "provider": "openai_compatible",
                "api_key": "new-llm-secret",
                "base_url": "https://llm.example/v1",
                "model": "chat-model",
                "request_timeout": 45,
                "max_retries": 3,
            },
            "image": {
                "provider": "fake",
                "api_key": "",
                "base_url": "",
                "model": "",
                "request_timeout": 120,
                "max_retries": 1,
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["llm"]["provider"] == "openai_compatible"
    assert payload["llm"]["api_key_present"] is True
    assert payload["llm"]["api_key_preview"] == "new-...cret"
    assert payload["image"]["provider"] == "fake"
    assert env_file.read_text(encoding="utf-8").splitlines() == [
        "APP_NAME=test",
        "LLM_API_KEY=new-llm-secret",
        "",
        "LLM_PROVIDER=openai_compatible",
        "LLM_BASE_URL=https://llm.example/v1",
        "LLM_TEXT_MODEL=chat-model",
        "LLM_REQUEST_TIMEOUT=45",
        "LLM_MAX_RETRIES=3",
        "IMAGE_PROVIDER=fake",
        "IMAGE_API_KEY=",
        "IMAGE_BASE_URL=",
        "IMAGE_MODEL=",
        "IMAGE_REQUEST_TIMEOUT=120",
        "IMAGE_MAX_RETRIES=1",
    ]


def test_provider_config_fake_models_and_connection_test():
    payload = {
        "kind": "llm",
        "config": {
            "provider": "fake",
            "base_url": "",
            "model": "",
            "request_timeout": 60,
            "max_retries": 2,
        },
    }

    models_response = client.post("/api/provider-config/models", json=payload)
    test_response = client.post("/api/provider-config/test", json=payload)

    assert models_response.status_code == 200
    assert models_response.json()["models"] == ["fake-hero-json-model"]
    assert test_response.status_code == 200
    assert test_response.json()["success"] is True


def test_provider_config_real_test_requires_api_key():
    response = client.post(
        "/api/provider-config/test",
        json={
            "kind": "llm",
            "config": {
                "provider": "openai",
                "api_key": "",
                "base_url": "",
                "model": "gpt-4.1-mini",
                "request_timeout": 60,
                "max_retries": 2,
            },
        },
    )

    assert response.status_code == 400
    assert "API Key" in response.json()["detail"]["message"]

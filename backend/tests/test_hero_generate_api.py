from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_payload(**overrides):
    payload = {
        "game_type": "MOBA",
        "hero_role": "法师",
        "element_theme": "火焰",
        "art_style": "暗黑奇幻",
        "core_gameplay": "范围爆发、持续灼烧、召唤火元素",
        "skill_count": 5,
        "generate_images": True,
        "generate_board": True,
    }
    payload.update(overrides)
    return payload


def test_generate_hero_returns_structured_design():
    response = client.post("/api/hero/generate", json=make_payload())

    assert response.status_code == 200
    payload = response.json()
    assert "hero_name" in payload
    assert "skills" in payload
    assert len(payload["skills"]) == 5


def test_generate_hero_invalid_skill_count_returns_422():
    response = client.post("/api/hero/generate", json=make_payload(skill_count=7))

    assert response.status_code == 422


def test_generate_hero_empty_core_gameplay_returns_422():
    response = client.post("/api/hero/generate", json=make_payload(core_gameplay=""))

    assert response.status_code == 422


def test_health_still_works():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_openai_provider_missing_api_key_returns_clear_error(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.setenv("LLM_TEXT_MODEL", "model-x")

    response = client.post("/api/hero/generate", json=make_payload())

    assert response.status_code == 500
    assert "LLM_API_KEY 未配置" in response.json()["detail"]["message"]

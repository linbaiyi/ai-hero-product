from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_vfx_design(skill_name: str = "烈焰冲击") -> dict:
    return {
        "skill_name": skill_name,
        "vfx_category": "AOE / Impact / Fire",
        "visual_keywords": ["火焰", "冲击波", "余烬", "爆裂"],
        "stages": [
            {"stage": "施法前摇", "description": "聚集橙红色火焰。"},
            {"stage": "技能主体", "description": "释放宽幅火焰冲击。"},
            {"stage": "飞行轨迹", "description": "拖出灼烧轨迹。"},
            {"stage": "命中反馈", "description": "产生火花爆裂。"},
        ],
        "color_palette": {
            "main": "#FF5A1F",
            "secondary": "#FFC15A",
            "dark": "#1A0B05",
        },
        "camera_suggestion": "命中时加入轻微震屏。",
        "sound_suggestion": "火焰喷涌声。",
        "image_prompt": None,
    }


def test_generate_image_prompt_returns_result():
    response = client.post(
        "/api/image-prompts/generate",
        json={
            "vfx_design": make_vfx_design(),
            "style_hint": "dark fantasy RPG skill effect thumbnail",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["skill_name"] == "烈焰冲击"
    assert "prompt" in payload
    assert "no text" in payload["prompt"]


def test_generate_image_prompt_batch_returns_result_list():
    response = client.post(
        "/api/image-prompts/generate-batch",
        json={"vfx_designs": [make_vfx_design("烈焰冲击"), make_vfx_design("燃魂领域")]},
    )

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 2


def test_generate_image_prompt_batch_empty_vfx_designs_returns_422():
    response = client.post(
        "/api/image-prompts/generate-batch",
        json={"vfx_designs": []},
    )

    assert response.status_code == 422


def test_generate_texture_prompt_set_returns_resource_prompts():
    response = client.post(
        "/api/image-prompts/generate-texture-set",
        json={
            "skill_name": "Flame Bolt",
            "skill_type": "projectile",
            "element": "fire",
            "keywords": ["orange flame"],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert set(payload["prompts"]) == {"projectile", "trail", "impact", "particle"}
    assert "transparent background" in payload["prompts"]["projectile"]
    assert "suitable for Three.js or Babylon.js" in payload["prompts"]["projectile"]


def test_generate_texture_prompt_set_from_vfx_returns_resource_prompts():
    response = client.post(
        "/api/image-prompts/generate-texture-set-from-vfx",
        json={
            "vfx_design": make_vfx_design(),
            "skill_type": "aoe",
            "element": "fire",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert set(payload["prompts"]) == {"ground_decal", "impact", "particle"}


def test_existing_endpoints_still_work():
    assert client.get("/health").status_code == 200

    hero_response = client.post(
        "/api/hero/generate",
        json={
            "game_type": "MOBA",
            "hero_role": "法师",
            "element_theme": "火焰",
            "art_style": "暗黑奇幻",
            "core_gameplay": "范围爆发、持续灼烧、召唤火元素",
            "skill_count": 5,
            "generate_images": True,
            "generate_board": True,
        },
    )
    assert hero_response.status_code == 200

    vfx_response = client.post(
        "/api/vfx/breakdown-batch",
        json={
            "hero_name": "烬炎使",
            "element_theme": "火焰",
            "art_style": "暗黑奇幻",
            "skills": hero_response.json()["skills"],
        },
    )
    assert vfx_response.status_code == 200

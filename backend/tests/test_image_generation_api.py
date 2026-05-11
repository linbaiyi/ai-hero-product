from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_image_prompt(skill_name: str = "烈焰冲击") -> dict:
    return {
        "skill_name": skill_name,
        "prompt": (
            "fire ember explosion burning game VFX concept art, dark background, "
            "no text, no logo, no watermark"
        ),
        "negative_prompt": "text, logo, watermark",
    }


def make_skill(name: str = "烈焰冲击") -> dict:
    return {
        "slot": "一技能",
        "name": name,
        "type": "AOE / 爆发",
        "description": "向前方释放一道火焰冲击。",
        "mechanics": "命中敌人后附加灼烧效果。",
        "cooldown": "8秒",
        "cost": "40法力",
        "damage_type": "魔法伤害",
        "balance_notes": "需要明显前摇。",
    }


def make_vfx_design(skill_name: str = "烈焰冲击") -> dict:
    return {
        "skill_name": skill_name,
        "vfx_category": "AOE / Impact / Fire",
        "visual_keywords": ["火焰", "余烬", "爆裂", "灼烧"],
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


def test_generate_image_returns_png_result():
    response = client.post(
        "/api/images/generate",
        json={
            "project_id": "api_single_001",
            "width": 512,
            "height": 512,
            "image_prompt": make_image_prompt(),
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "image_path" in payload
    assert payload["success"] is True
    assert Path(payload["image_path"]).exists()


def test_generate_image_batch_returns_result_list():
    response = client.post(
        "/api/images/generate-batch",
        json={
            "project_id": "api_batch_001",
            "width": 512,
            "height": 512,
            "image_prompts": [
                make_image_prompt("烈焰冲击"),
                make_image_prompt("寒冰裂隙"),
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 2
    assert all(item["success"] for item in payload)
    assert all(Path(item["image_path"]).exists() for item in payload)


def test_generate_image_batch_empty_prompts_returns_422():
    response = client.post(
        "/api/images/generate-batch",
        json={"image_prompts": []},
    )

    assert response.status_code == 422


def test_generate_image_invalid_width_returns_422():
    response = client.post(
        "/api/images/generate",
        json={"width": 128, "height": 512, "image_prompt": make_image_prompt()},
    )

    assert response.status_code == 422


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
            "hero_name": "焚烬法皇",
            "element_theme": "火焰",
            "art_style": "暗黑奇幻",
            "skills": [make_skill()],
        },
    )
    assert vfx_response.status_code == 200

    prompt_response = client.post(
        "/api/image-prompts/generate-batch",
        json={"vfx_designs": [make_vfx_design()]},
    )
    assert prompt_response.status_code == 200


def test_openai_image_provider_missing_api_key_returns_clear_error(monkeypatch):
    monkeypatch.setenv("IMAGE_PROVIDER", "openai")
    monkeypatch.delenv("IMAGE_API_KEY", raising=False)
    monkeypatch.setenv("IMAGE_MODEL", "image-model")

    response = client.post(
        "/api/images/generate",
        json={
            "project_id": "missing_key_001",
            "width": 512,
            "height": 512,
            "image_prompt": make_image_prompt(),
        },
    )

    assert response.status_code == 500
    assert "IMAGE_API_KEY 未配置" in response.json()["detail"]["message"]

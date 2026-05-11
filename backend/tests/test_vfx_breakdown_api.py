from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_skill(name: str = "烈焰冲击") -> dict:
    return {
        "slot": "一技能",
        "name": name,
        "type": "AOE / 爆发",
        "description": "向前方释放一道火焰冲击，对路径敌人造成伤害。",
        "mechanics": "命中敌人后附加灼烧效果。",
        "cooldown": "8秒",
        "cost": "40法力",
        "damage_type": "魔法伤害",
        "balance_notes": "需要明显前摇避免瞬发过强。",
    }


def test_vfx_breakdown_returns_single_design():
    response = client.post(
        "/api/vfx/breakdown",
        json={
            "hero_name": "焚烬法皇",
            "element_theme": "火焰",
            "art_style": "暗黑奇幻",
            "skill": make_skill(),
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["skill_name"] == "烈焰冲击"
    assert "stages" in payload
    assert "visual_keywords" in payload


def test_vfx_breakdown_batch_returns_design_list():
    response = client.post(
        "/api/vfx/breakdown-batch",
        json={
            "hero_name": "焚烬法皇",
            "element_theme": "火焰",
            "art_style": "暗黑奇幻",
            "skills": [make_skill("烈焰冲击"), make_skill("燃魂领域")],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 2


def test_vfx_breakdown_batch_empty_skills_returns_422():
    response = client.post(
        "/api/vfx/breakdown-batch",
        json={
            "hero_name": "焚烬法皇",
            "element_theme": "火焰",
            "art_style": "暗黑奇幻",
            "skills": [],
        },
    )

    assert response.status_code == 422


def test_health_still_works():
    response = client.get("/health")

    assert response.status_code == 200


def test_hero_generate_still_works():
    response = client.post(
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

    assert response.status_code == 200
    assert "hero_name" in response.json()

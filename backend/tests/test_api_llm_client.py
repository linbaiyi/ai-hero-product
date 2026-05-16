import json
from types import SimpleNamespace

import pytest

from app.clients.api_llm_client import ApiLLMClient
from app.services.playable_spec_service import build_safe_default_spec


def make_client(output_text: str, **kwargs) -> ApiLLMClient:
    class Responses:
        def create(self, **request_kwargs):
            self.request_kwargs = request_kwargs
            return SimpleNamespace(output_text=output_text)

    class FakeOpenAIClient:
        def __init__(self):
            self.responses = Responses()

    fake = FakeOpenAIClient()
    client = ApiLLMClient(
        provider="openai",
        api_key="test-key",
        model="model-x",
        openai_client=fake,
        **kwargs,
    )
    client.fake_openai_client = fake
    return client


def hero_json() -> str:
    return """
    {
      "hero_name": "焚烬法皇",
      "hero_title": "灰烬王座的咒火者",
      "role": "法师",
      "difficulty": 4,
      "core_tags": ["火焰", "范围爆发"],
      "background": "来自熔火遗迹的英雄。",
      "combat_style": "范围爆发和持续灼烧。",
      "skills": [{
        "slot": "一技能",
        "name": "烈焰冲击",
        "type": "主动",
        "description": "火焰冲击。",
        "mechanics": "附加灼烧。",
        "cooldown": "8秒",
        "cost": "40法力",
        "damage_type": "魔法伤害",
        "balance_notes": "有前摇。"
      }],
      "combo_logic": "先灼烧再引爆。",
      "counterplay": "躲避前摇。",
      "balance_summary": "爆发高。"
    }
    """


def vfx_json() -> str:
    return """
    {
      "skill_name": "烈焰冲击",
      "vfx_category": "AOE / Impact / Fire",
      "visual_keywords": ["火焰", "余烬"],
      "stages": [
        {"stage": "施法前摇", "description": "聚火。"},
        {"stage": "技能主体", "description": "冲击。"},
        {"stage": "飞行轨迹", "description": "轨迹。"},
        {"stage": "命中反馈", "description": "爆裂。"}
      ],
      "color_palette": {"main": "#FF5A1F"},
      "camera_suggestion": "轻微震屏。",
      "sound_suggestion": "火焰声。",
      "image_prompt": null
    }
    """


def image_prompt_json() -> str:
    return """
    {
      "skill_name": "烈焰冲击",
      "prompt": "fire ember explosion burning game VFX concept art, dark background, no text, no logo, no watermark",
      "negative_prompt": "text, logo, watermark"
    }
    """


def test_hero_schema_name_validates_hero_design():
    client = make_client(hero_json())

    result = client.generate_json("prompt", schema_name="hero_design")

    assert result["hero_name"] == "焚烬法皇"
    assert client.fake_openai_client.responses.request_kwargs["text"]["format"]["name"] == "hero_design"


def test_vfx_schema_name_validates_vfx_design():
    client = make_client(vfx_json())

    result = client.generate_json("prompt", schema_name="vfx_design")

    assert result["skill_name"] == "烈焰冲击"


def test_image_prompt_schema_name_validates_image_prompt_result():
    client = make_client(image_prompt_json())

    result = client.generate_json("prompt", schema_name="image_prompt")

    assert "game VFX concept art" in result["prompt"]


def test_playable_schema_name_validates_playable_spec():
    playable_json = build_safe_default_spec(
        {
            "hero_name": "Solar Warden",
            "hero_title": "Keeper of the Trial Gate",
            "role": "fighter",
            "core_tags": ["holy"],
        }
    )
    client = make_client(json.dumps(playable_json))

    result = client.generate_json("prompt", schema_name="playable_spec")

    assert result["version"] == "1.0"
    assert {skill["slot"] for skill in result["skills"]} == {"Q", "W", "E", "R"}


def test_unsupported_schema_name_raises_value_error():
    client = make_client(hero_json())

    with pytest.raises(ValueError, match="不支持的 schema_name"):
        client.generate_json("prompt", schema_name="unknown")


def test_empty_model_output_raises_value_error():
    client = make_client("")

    with pytest.raises(ValueError, match="大模型返回内容为空"):
        client.generate_json("prompt", schema_name="hero_design")


def test_invalid_json_raises_value_error():
    client = make_client("not json")

    with pytest.raises(ValueError, match="大模型返回的 JSON 无法解析"):
        client.generate_json("prompt", schema_name="hero_design")


def test_json_wrapped_in_explanatory_text_is_parsed():
    client = make_client(f"Here is the JSON:\n{hero_json()}\nDone.")

    result = client.generate_json("prompt", schema_name="hero_design")

    assert result["hero_name"] == "焚烬法皇"


def test_schema_validation_failure_raises_value_error():
    client = make_client('{"hero_name": "missing fields"}')

    with pytest.raises(ValueError):
        client.generate_json("prompt", schema_name="hero_design")


def test_api_exception_becomes_chinese_runtime_error():
    class BrokenResponses:
        def create(self, **kwargs):
            raise RuntimeError("boom")

    fake = SimpleNamespace(responses=BrokenResponses())
    client = ApiLLMClient(
        provider="openai",
        api_key="test-key",
        model="model-x",
        openai_client=fake,
    )

    with pytest.raises(RuntimeError, match="真实大模型 API 调用失败"):
        client.generate_json("prompt", schema_name="hero_design")


def test_openai_compatible_keeps_base_url():
    client = ApiLLMClient(
        provider="openai_compatible",
        api_key="test-key",
        model="model-x",
        base_url="https://example.com/v1",
        openai_client=SimpleNamespace(responses=SimpleNamespace(create=lambda **_: SimpleNamespace(output_text=hero_json()))),
    )

    assert client.base_url == "https://example.com/v1"

from app.clients.fake_llm_client import FakeLLMClient


def test_fake_llm_client_returns_dict_with_hero_name_and_skills():
    result = FakeLLMClient().generate_json(
        "元素主题：火焰\n英雄定位：法师\n美术风格：暗黑奇幻\n核心玩法：范围爆发\n技能数量：5",
        schema_name="hero_design",
    )

    assert isinstance(result, dict)
    assert "hero_name" in result
    assert "skills" in result


def test_fake_llm_client_reflects_fire_theme():
    result = FakeLLMClient().generate_json(
        "元素主题：火焰\n英雄定位：法师\n美术风格：暗黑奇幻\n核心玩法：持续灼烧\n技能数量：5",
        schema_name="hero_design",
    )

    content = str(result)
    assert "火" in content or "灼烧" in content or "烈焰" in content


def test_fake_llm_client_returns_requested_skill_count():
    result = FakeLLMClient().generate_json(
        "元素主题：暗影\n英雄定位：刺客\n美术风格：暗黑奇幻\n核心玩法：突进爆发\n技能数量：5",
        schema_name="hero_design",
    )

    assert len(result["skills"]) == 5


def test_fake_llm_client_returns_vfx_design_dict():
    result = FakeLLMClient().generate_json(
        "元素主题：火焰\n技能名称：烈焰冲击\n技能类型：AOE / 爆发\n技能描述：释放火焰冲击\n技能机制：附加灼烧",
        schema_name="vfx_design",
    )

    assert isinstance(result, dict)
    assert "skill_name" in result
    assert "visual_keywords" in result
    assert "stages" in result
    assert len(result["stages"]) >= 5


def test_fake_llm_client_vfx_fire_keywords():
    result = FakeLLMClient().generate_json(
        "元素主题：火焰\n技能名称：烈焰冲击",
        schema_name="vfx_design",
    )

    assert {"火焰", "余烬", "爆裂", "灼烧"}.issubset(
        set(result["visual_keywords"])
    )


def test_fake_llm_client_vfx_shadow_keywords():
    result = FakeLLMClient().generate_json(
        "元素主题：暗影\n技能名称：影袭终裁",
        schema_name="vfx_design",
    )

    assert {"暗影", "残像", "黑雾", "撕裂"}.issubset(
        set(result["visual_keywords"])
    )


def test_fake_llm_client_returns_image_prompt_dict():
    result = FakeLLMClient().generate_json(
        "skill_name: 烈焰冲击\nvisual_keywords: 火焰, 余烬, 爆裂, 灼烧",
        schema_name="image_prompt",
    )

    assert isinstance(result, dict)
    assert "skill_name" in result
    assert "prompt" in result
    assert "no text" in result["prompt"]
    assert "no logo" in result["prompt"]
    assert "no watermark" in result["prompt"]


def test_fake_llm_client_image_prompt_fire_keywords():
    result = FakeLLMClient().generate_json(
        "skill_name: 烈焰冲击\nvisual_keywords: 火焰, 余烬, 爆裂, 灼烧",
        schema_name="image_prompt",
    )

    prompt = result["prompt"].lower()
    assert "fire" in prompt or "ember" in prompt


def test_fake_llm_client_image_prompt_shadow_keywords():
    result = FakeLLMClient().generate_json(
        "skill_name: 影袭终裁\nvisual_keywords: 暗影, 黑雾, 残像",
        schema_name="image_prompt",
    )

    prompt = result["prompt"].lower()
    assert "shadow" in prompt or "dark mist" in prompt


def test_fake_llm_client_image_prompt_is_english_like():
    result = FakeLLMClient().generate_json(
        "skill_name: 烈焰冲击\nvisual_keywords: 火焰, 余烬, 爆裂, 灼烧",
        schema_name="image_prompt",
    )

    prompt = result["prompt"]
    assert "game VFX concept art" in prompt
    assert "dark background" in prompt

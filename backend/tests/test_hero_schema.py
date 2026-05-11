import pytest
from pydantic import ValidationError

from app.schemas.hero_schema import HeroDesign, SkillDesign
from app.schemas.request_schema import HeroGenerateRequest


def make_request(**overrides):
    data = {
        "game_type": "MOBA",
        "hero_role": "法师",
        "element_theme": "火焰",
        "art_style": "暗黑奇幻",
        "core_gameplay": "范围爆发、持续灼烧、召唤火元素",
        "skill_count": 5,
        "generate_images": True,
        "generate_board": True,
    }
    data.update(overrides)
    return HeroGenerateRequest(**data)


def make_skill(**overrides):
    data = {
        "slot": "一技能",
        "name": "烈焰冲击",
        "type": "主动",
        "description": "释放一道火焰冲击波。",
        "mechanics": "命中后造成范围伤害并附加灼烧。",
        "cooldown": "8 秒",
        "cost": "40 法力",
        "damage_type": "魔法伤害",
        "balance_notes": "范围较大但前摇明显。",
    }
    data.update(overrides)
    return SkillDesign(**data)


def make_hero_design(**overrides):
    data = {
        "hero_name": "烬炎使",
        "hero_title": "灰烬王座的咏火者",
        "role": "法师",
        "difficulty": 4,
        "core_tags": ["火焰", "范围爆发"],
        "background": "来自熔火遗迹的英雄。",
        "combat_style": "依靠范围爆发和持续灼烧压制战场。",
        "skills": [make_skill()],
        "combo_logic": "先叠加灼烧，再用终极技能引爆。",
        "counterplay": "利用位移躲避前摇技能。",
        "balance_summary": "爆发高但缺少机动性。",
    }
    data.update(overrides)
    return HeroDesign(**data)


def test_valid_hero_generate_request_passes_validation():
    req = make_request()

    assert req.game_type == "MOBA"
    assert req.skill_count == 5


def test_empty_core_gameplay_fails_validation():
    with pytest.raises(ValidationError):
        make_request(core_gameplay=" ")


def test_skill_count_less_than_3_fails_validation():
    with pytest.raises(ValidationError):
        make_request(skill_count=2)


def test_skill_count_greater_than_6_fails_validation():
    with pytest.raises(ValidationError):
        make_request(skill_count=7)


def test_valid_hero_design_passes_validation():
    design = make_hero_design()

    assert design.hero_name == "烬炎使"
    assert len(design.skills) == 1


def test_hero_design_empty_skills_fails_validation():
    with pytest.raises(ValidationError):
        make_hero_design(skills=[])


def test_hero_design_difficulty_out_of_range_fails_validation():
    with pytest.raises(ValidationError):
        make_hero_design(difficulty=6)

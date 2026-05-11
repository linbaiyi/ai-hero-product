import pytest
from pydantic import ValidationError

from app.schemas.hero_schema import SkillDesign
from app.schemas.vfx_schema import (
    VfxBreakdownBatchRequest,
    VfxBreakdownRequest,
    VfxDesign,
    VfxStage,
)


def make_skill(**overrides):
    data = {
        "slot": "一技能",
        "name": "烈焰冲击",
        "type": "AOE / 爆发",
        "description": "向前方释放一道火焰冲击，对路径敌人造成伤害。",
        "mechanics": "命中敌人后附加灼烧效果。",
        "cooldown": "8秒",
        "cost": "40法力",
        "damage_type": "魔法伤害",
        "balance_notes": "需要明显前摇避免瞬发过强。",
    }
    data.update(overrides)
    return SkillDesign(**data)


def make_stage(**overrides):
    data = {
        "stage": "施法前摇",
        "description": "角色手中聚集橙红色火焰，周围出现少量余烬粒子。",
    }
    data.update(overrides)
    return VfxStage(**data)


def make_vfx_design(**overrides):
    data = {
        "skill_name": "烈焰冲击",
        "vfx_category": "AOE / Impact / Fire",
        "visual_keywords": ["火焰", "余烬", "爆裂", "灼烧"],
        "stages": [
            make_stage(stage="施法前摇"),
            make_stage(stage="技能主体"),
            make_stage(stage="飞行轨迹"),
            make_stage(stage="命中反馈"),
        ],
        "color_palette": {
            "main": "#FF5A1F",
            "secondary": "#FFC15A",
            "dark": "#1A0B05",
        },
        "camera_suggestion": "命中时加入轻微震屏和短暂亮度闪烁。",
        "sound_suggestion": "火焰喷涌声、低频冲击声和余烬燃烧声。",
        "image_prompt": None,
    }
    data.update(overrides)
    return VfxDesign(**data)


def test_valid_vfx_stage_passes_validation():
    stage = make_stage()

    assert stage.stage == "施法前摇"


def test_empty_stage_fails_validation():
    with pytest.raises(ValidationError):
        make_stage(stage="")


def test_valid_vfx_design_passes_validation():
    design = make_vfx_design()

    assert design.skill_name == "烈焰冲击"


def test_vfx_design_less_than_4_stages_fails_validation():
    with pytest.raises(ValidationError):
        make_vfx_design(stages=[make_stage(), make_stage(), make_stage()])


def test_vfx_design_empty_visual_keywords_fails_validation():
    with pytest.raises(ValidationError):
        make_vfx_design(visual_keywords=[])


def test_valid_vfx_breakdown_request_passes_validation():
    req = VfxBreakdownRequest(
        hero_name="焚烬法皇",
        element_theme="火焰",
        art_style="暗黑奇幻",
        skill=make_skill(),
    )

    assert req.skill.name == "烈焰冲击"


def test_vfx_batch_request_empty_skills_fails_validation():
    with pytest.raises(ValidationError):
        VfxBreakdownBatchRequest(
            hero_name="焚烬法皇",
            element_theme="火焰",
            art_style="暗黑奇幻",
            skills=[],
        )

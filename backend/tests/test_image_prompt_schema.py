import pytest
from pydantic import ValidationError

from app.schemas.image_prompt_schema import (
    ImagePromptBatchRequest,
    ImagePromptRequest,
    ImagePromptResult,
)
from app.schemas.vfx_schema import VfxDesign, VfxStage


def make_vfx_design(**overrides):
    data = {
        "skill_name": "烈焰冲击",
        "vfx_category": "AOE / Impact / Fire",
        "visual_keywords": ["火焰", "冲击波", "余烬", "爆裂"],
        "stages": [
            VfxStage(stage="施法前摇", description="聚集橙红色火焰。"),
            VfxStage(stage="技能主体", description="释放宽幅火焰冲击。"),
            VfxStage(stage="飞行轨迹", description="拖出灼烧轨迹。"),
            VfxStage(stage="命中反馈", description="产生火花爆裂。"),
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
    data.update(overrides)
    return VfxDesign(**data)


def test_valid_image_prompt_request_passes_validation():
    req = ImagePromptRequest(
        vfx_design=make_vfx_design(),
        style_hint="dark fantasy RPG skill effect thumbnail",
    )

    assert req.vfx_design.skill_name == "烈焰冲击"


def test_valid_image_prompt_batch_request_passes_validation():
    req = ImagePromptBatchRequest(vfx_designs=[make_vfx_design()])

    assert len(req.vfx_designs) == 1


def test_empty_vfx_designs_fails_validation():
    with pytest.raises(ValidationError):
        ImagePromptBatchRequest(vfx_designs=[])


def test_valid_image_prompt_result_passes_validation():
    result = ImagePromptResult(
        skill_name="烈焰冲击",
        prompt=(
            "A high-end game VFX concept art thumbnail, fire impact wave, "
            "dark background, no text, no logo, no watermark."
        ),
        negative_prompt="text, logo, watermark",
    )

    assert result.skill_name == "烈焰冲击"


def test_empty_prompt_fails_validation():
    with pytest.raises(ValidationError):
        ImagePromptResult(skill_name="烈焰冲击", prompt="")


def test_empty_skill_name_fails_validation():
    with pytest.raises(ValidationError):
        ImagePromptResult(skill_name="", prompt="A valid English image prompt.")

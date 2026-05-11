import pytest

from app.clients.fake_llm_client import FakeLLMClient
from app.schemas.image_prompt_schema import ImagePromptBatchRequest, ImagePromptRequest
from app.schemas.vfx_schema import VfxDesign, VfxStage
from app.services.image_prompt_service import ImagePromptService


class BrokenLLMClient:
    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        return {"skill_name": "坏数据"}


def make_vfx_design(skill_name: str = "烈焰冲击") -> VfxDesign:
    return VfxDesign(
        skill_name=skill_name,
        vfx_category="AOE / Impact / Fire",
        visual_keywords=["火焰", "余烬", "爆裂", "灼烧"],
        stages=[
            VfxStage(stage="施法前摇", description="聚集橙红色火焰。"),
            VfxStage(stage="技能主体", description="释放宽幅火焰冲击。"),
            VfxStage(stage="飞行轨迹", description="拖出灼烧轨迹。"),
            VfxStage(stage="命中反馈", description="产生火花爆裂。"),
        ],
        color_palette={
            "main": "#FF5A1F",
            "secondary": "#FFC15A",
            "dark": "#1A0B05",
        },
        camera_suggestion="命中时加入轻微震屏。",
        sound_suggestion="火焰喷涌声。",
        image_prompt=None,
    )


def test_generate_for_vfx_returns_image_prompt_result():
    service = ImagePromptService(llm_client=FakeLLMClient())

    result = service.generate_for_vfx(
        ImagePromptRequest(vfx_design=make_vfx_design())
    )

    assert result.skill_name == "烈焰冲击"
    assert result.prompt
    assert "no text" in result.prompt
    assert "no logo" in result.prompt
    assert "no watermark" in result.prompt


def test_generate_for_vfx_batch_returns_same_count():
    service = ImagePromptService(llm_client=FakeLLMClient())
    req = ImagePromptBatchRequest(
        vfx_designs=[make_vfx_design("烈焰冲击"), make_vfx_design("燃魂领域")]
    )

    result = service.generate_for_vfx_batch(req)

    assert len(result) == 2
    assert result[0].skill_name == "烈焰冲击"
    assert result[1].skill_name == "燃魂领域"


def test_generate_for_vfx_raises_clear_error_when_llm_response_is_invalid():
    service = ImagePromptService(llm_client=BrokenLLMClient())

    with pytest.raises(ValueError, match="LLM 返回的图像 Prompt 格式不合法"):
        service.generate_for_vfx(ImagePromptRequest(vfx_design=make_vfx_design()))


def test_generate_for_vfx_keeps_original_skill_name_when_llm_renames_it():
    class RenamingLLMClient:
        def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
            return {
                "skill_name": "Translated Skill Name",
                "prompt": (
                    "game VFX concept art, dark background, no text, no logo, "
                    "no watermark, single skill effect thumbnail with fire impact."
                ),
                "negative_prompt": "text, logo, watermark",
            }

    service = ImagePromptService(llm_client=RenamingLLMClient())

    result = service.generate_for_vfx(
        ImagePromptRequest(vfx_design=make_vfx_design("鐑堢劙鍐插嚮"))
    )

    assert result.skill_name == "鐑堢劙鍐插嚮"

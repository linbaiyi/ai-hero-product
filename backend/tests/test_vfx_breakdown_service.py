import pytest

from app.clients.fake_llm_client import FakeLLMClient
from app.schemas.hero_schema import SkillDesign
from app.schemas.vfx_schema import VfxBreakdownBatchRequest, VfxBreakdownRequest
from app.services.vfx_breakdown_service import VfxBreakdownService


class BrokenLLMClient:
    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        return {"skill_name": "坏数据"}


def make_skill(name: str = "烈焰冲击") -> SkillDesign:
    return SkillDesign(
        slot="一技能",
        name=name,
        type="AOE / 爆发",
        description="向前方释放一道火焰冲击，对路径敌人造成伤害。",
        mechanics="命中敌人后附加灼烧效果。",
        cooldown="8秒",
        cost="40法力",
        damage_type="魔法伤害",
        balance_notes="需要明显前摇避免瞬发过强。",
    )


def make_request(skill: SkillDesign | None = None) -> VfxBreakdownRequest:
    return VfxBreakdownRequest(
        hero_name="焚烬法皇",
        element_theme="火焰",
        art_style="暗黑奇幻",
        skill=skill or make_skill(),
    )


def test_generate_for_skill_returns_vfx_design():
    service = VfxBreakdownService(llm_client=FakeLLMClient())

    result = service.generate_for_skill(make_request())

    assert result.skill_name == "烈焰冲击"
    assert len(result.stages) >= 4
    assert result.visual_keywords


def test_generate_for_skills_returns_list_with_same_count():
    service = VfxBreakdownService(llm_client=FakeLLMClient())
    req = VfxBreakdownBatchRequest(
        hero_name="焚烬法皇",
        element_theme="火焰",
        art_style="暗黑奇幻",
        skills=[make_skill("烈焰冲击"), make_skill("燃魂领域")],
    )

    result = service.generate_for_skills(req)

    assert len(result) == 2
    assert result[0].skill_name == "烈焰冲击"
    assert result[1].skill_name == "燃魂领域"


def test_generate_for_skill_raises_clear_error_when_llm_response_is_invalid():
    service = VfxBreakdownService(llm_client=BrokenLLMClient())

    with pytest.raises(ValueError, match="LLM 返回的特效拆解格式不合法"):
        service.generate_for_skill(make_request())

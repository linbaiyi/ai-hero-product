import pytest

from app.clients.llm_client import LLMClient
from app.schemas.request_schema import HeroGenerateRequest
from app.services.hero_generation_service import HeroGenerationService


class RecordingLLMClient:
    def __init__(self):
        self.called_with: tuple[str, str | None] | None = None

    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        self.called_with = (prompt, schema_name)
        return {
            "hero_name": "烬炎使",
            "hero_title": "灰烬王座的咏火者",
            "role": "法师",
            "difficulty": 4,
            "core_tags": ["火焰", "范围爆发"],
            "background": "来自熔火遗迹的英雄。",
            "combat_style": "依靠范围爆发和持续灼烧压制战场。",
            "skills": [
                {
                    "slot": "被动",
                    "name": "余烬印记",
                    "type": "被动",
                    "description": "技能命中后附加灼烧印记。",
                    "mechanics": "印记叠满后造成额外魔法伤害。",
                    "cooldown": "无",
                    "cost": "无",
                    "damage_type": "魔法伤害",
                    "balance_notes": "需要连续命中才能打满收益。",
                },
                {
                    "slot": "一技能",
                    "name": "烈焰冲击",
                    "type": "主动",
                    "description": "释放火焰冲击波。",
                    "mechanics": "造成范围伤害。",
                    "cooldown": "8 秒",
                    "cost": "40 法力",
                    "damage_type": "魔法伤害",
                    "balance_notes": "前摇明显。",
                },
                {
                    "slot": "二技能",
                    "name": "燃魂领域",
                    "type": "主动",
                    "description": "创造持续燃烧区域。",
                    "mechanics": "区域内敌人持续受伤。",
                    "cooldown": "12 秒",
                    "cost": "60 法力",
                    "damage_type": "持续伤害",
                    "balance_notes": "需要控场配合。",
                },
            ],
            "combo_logic": "先叠加灼烧，再用范围技能收割。",
            "counterplay": "拉开距离并躲避前摇。",
            "balance_summary": "爆发高但机动性弱。",
        }


class BrokenLLMClient:
    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        return {"hero_name": "坏数据"}


def make_request(skill_count: int = 3):
    return HeroGenerateRequest(
        game_type="MOBA",
        hero_role="法师",
        element_theme="火焰",
        art_style="暗黑奇幻",
        core_gameplay="范围爆发、持续灼烧、召唤火元素",
        skill_count=skill_count,
        generate_images=True,
        generate_board=True,
    )


def test_service_generate_returns_hero_design():
    service = HeroGenerationService(llm_client=RecordingLLMClient())

    result = service.generate(make_request())

    assert result.hero_name == "烬炎使"


def test_service_calls_llm_client_generate_json():
    llm_client = RecordingLLMClient()
    service = HeroGenerationService(llm_client=llm_client)

    service.generate(make_request())

    assert llm_client.called_with is not None
    assert llm_client.called_with[1] == "hero_design"


def test_service_returns_correct_skill_count():
    service = HeroGenerationService(llm_client=RecordingLLMClient())

    result = service.generate(make_request(skill_count=3))

    assert len(result.skills) == 3


def test_service_raises_clear_error_when_llm_response_is_invalid():
    service = HeroGenerationService(llm_client=BrokenLLMClient())

    with pytest.raises(ValueError, match="LLM 返回的英雄方案格式不合法"):
        service.generate(make_request())

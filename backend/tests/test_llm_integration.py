import os

import pytest

from app.clients.llm_client_factory import create_llm_client


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LLM_INTEGRATION_TESTS") != "1"
    or os.getenv("LLM_PROVIDER", "fake") == "fake"
    or not os.getenv("LLM_API_KEY"),
    reason="真实 LLM 集成测试默认跳过，需要显式配置环境变量。",
)


def test_real_llm_can_generate_image_prompt_json():
    client = create_llm_client()
    result = client.generate_json(
        "请只输出 JSON。skill_name: Test Skill。生成一个英文 game VFX concept art prompt，必须包含 dark background, no text, no logo, no watermark。",
        schema_name="image_prompt",
    )

    assert result["skill_name"]
    assert "prompt" in result

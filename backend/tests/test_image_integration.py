import os

import pytest

from app.clients.image_client_factory import create_image_client


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_IMAGE_INTEGRATION_TESTS") != "1"
    or os.getenv("IMAGE_PROVIDER", "fake") == "fake"
    or not os.getenv("IMAGE_API_KEY"),
    reason="真实图像集成测试默认跳过，需要显式配置环境变量。",
)


def test_real_image_client_can_generate_png(tmp_path):
    client = create_image_client()
    save_path = tmp_path / "integration.png"

    result = client.generate_image(
        prompt="A small glowing fire orb game VFX concept art, dark background, no text, no logo, no watermark",
        negative_prompt=None,
        save_path=str(save_path),
        width=int(os.getenv("IMAGE_DEFAULT_WIDTH", "1024")),
        height=int(os.getenv("IMAGE_DEFAULT_HEIGHT", "1024")),
    )

    assert result == str(save_path)
    assert save_path.exists()

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from board_test_helpers import make_board_request


client = TestClient(app)


def make_image_prompt(skill_name: str = "烈焰冲击") -> dict:
    return {
        "skill_name": skill_name,
        "prompt": "fire ember explosion burning game VFX concept art, dark background, no text, no logo, no watermark",
        "negative_prompt": "text, logo, watermark",
    }


def test_board_render_returns_board_png_result():
    response = client.post(
        "/api/boards/render",
        json=make_board_request(project_id="api_board_001", image_results=[]),
    )

    assert response.status_code == 200
    payload = response.json()
    assert "board_path" in payload
    assert payload["success"] is True
    assert Path(payload["board_path"]).exists()


def test_board_render_empty_vfx_designs_returns_422():
    response = client.post(
        "/api/boards/render",
        json=make_board_request(vfx_designs=[]),
    )

    assert response.status_code == 422


def test_board_render_invalid_width_returns_422():
    response = client.post(
        "/api/boards/render",
        json=make_board_request(width=900),
    )

    assert response.status_code == 422


def test_rendered_board_can_be_served_by_file_route():
    render_response = client.post(
        "/api/boards/render",
        json=make_board_request(project_id="api_board_file_001", image_results=[]),
    )
    board_path = render_response.json()["board_path"]

    file_response = client.get(f"/api/files/{board_path}")

    assert file_response.status_code == 200
    assert file_response.headers["content-type"] == "image/png"


def test_existing_endpoints_still_work():
    assert client.get("/health").status_code == 200

    image_response = client.post(
        "/api/images/generate-batch",
        json={
            "project_id": "board_existing_images_001",
            "width": 256,
            "height": 256,
            "image_prompts": [make_image_prompt()],
        },
    )
    assert image_response.status_code == 200

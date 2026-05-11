from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


client = TestClient(app)


def make_png(relative_path: str) -> str:
    path = Path(relative_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (16, 16), (255, 90, 31)).save(path, "PNG")
    return path.as_posix()


def make_image_prompt(skill_name: str = "烈焰冲击") -> dict:
    return {
        "skill_name": skill_name,
        "prompt": "fire ember explosion burning game VFX concept art, dark background, no text, no logo, no watermark",
        "negative_prompt": "text, logo, watermark",
    }


def test_file_route_serves_existing_output_png():
    image_path = make_png("outputs/images/file_route_demo/skill_fire.png")

    response = client.get(f"/api/files/{image_path}")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG")


def test_file_route_missing_file_returns_404():
    response = client.get("/api/files/outputs/images/file_route_demo/missing.png")

    assert response.status_code == 404


def test_file_route_rejects_parent_directory_escape():
    response = client.get("/api/files/outputs/images/%2E%2E/secret.png")

    assert response.status_code in {400, 403}


def test_file_route_rejects_access_outside_outputs():
    response = client.get("/api/files/app/main.py")

    assert response.status_code in {400, 403}


def test_health_still_works_with_file_route_registered():
    response = client.get("/health")

    assert response.status_code == 200


def test_image_generate_batch_still_works_with_file_route_registered():
    response = client.post(
        "/api/images/generate-batch",
        json={
            "project_id": "file_route_batch_001",
            "width": 256,
            "height": 256,
            "image_prompts": [make_image_prompt("烈焰冲击")],
        },
    )

    assert response.status_code == 200
    assert len(response.json()) == 1

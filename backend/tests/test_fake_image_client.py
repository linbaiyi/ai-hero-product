from pathlib import Path

from PIL import Image

from app.clients.fake_image_client import FakeImageClient


def assert_png_created(path: Path, width: int, height: int) -> None:
    assert path.exists()
    with Image.open(path) as image:
        assert image.format == "PNG"
        assert image.size == (width, height)


def test_fake_image_client_generates_png_file(tmp_path):
    save_path = tmp_path / "preview.png"
    client = FakeImageClient()

    result = client.generate_image(
        prompt="fire ember explosion game VFX concept art",
        negative_prompt=None,
        save_path=str(save_path),
        width=320,
        height=256,
    )

    assert result == str(save_path)
    assert_png_created(save_path, 320, 256)


def test_fake_image_client_generates_fire_preview(tmp_path):
    save_path = tmp_path / "fire.png"

    FakeImageClient().generate_image(
        "fire ember explosion burning",
        None,
        str(save_path),
        256,
        256,
    )

    assert_png_created(save_path, 256, 256)


def test_fake_image_client_generates_ice_preview(tmp_path):
    save_path = tmp_path / "ice.png"

    FakeImageClient().generate_image(
        "ice frost crystal freezing",
        None,
        str(save_path),
        256,
        256,
    )

    assert_png_created(save_path, 256, 256)


def test_fake_image_client_generates_shadow_preview(tmp_path):
    save_path = tmp_path / "shadow.png"

    FakeImageClient().generate_image(
        "shadow dark mist afterimage",
        None,
        str(save_path),
        256,
        256,
    )

    assert_png_created(save_path, 256, 256)


def test_fake_image_client_generates_generic_preview_for_empty_prompt(tmp_path):
    save_path = tmp_path / "generic.png"

    FakeImageClient().generate_image("", None, str(save_path), 256, 256)

    assert_png_created(save_path, 256, 256)

from pathlib import Path

import pytest
from PIL import Image, ImageDraw

from app.services.runtime_vfx_image_postprocess import (
    RuntimeVfxImagePostprocessError,
    cleanup_runtime_vfx_texture,
)


def _save_test_texture(path: Path, mode: str = "RGBA") -> None:
    image = Image.new("RGBA", (8, 8), (240, 240, 240, 255))
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rectangle((3, 3, 4, 4), fill=(255, 90, 31, 255))
    if mode == "RGB":
        image = image.convert("RGB")
    image.save(path, format="PNG")


def test_cleanup_converts_white_checkerboard_like_background_to_transparent(tmp_path):
    path = tmp_path / "checker.png"
    image = Image.new("RGBA", (4, 4), (255, 255, 255, 255))
    pixels = image.load()
    for y in range(4):
        for x in range(4):
            pixels[x, y] = (235, 235, 235, 255) if (x + y) % 2 else (255, 255, 255, 255)
    pixels[1, 1] = (255, 90, 31, 255)
    image.save(path, format="PNG")

    cleanup_runtime_vfx_texture(str(path))

    cleaned = Image.open(path).convert("RGBA")
    assert cleaned.getpixel((0, 0))[3] == 0
    assert cleaned.getpixel((1, 0))[3] == 0


def test_cleanup_keeps_orange_red_fire_pixels_opaque(tmp_path):
    path = tmp_path / "fire.png"
    _save_test_texture(path)

    cleanup_runtime_vfx_texture(str(path))

    cleaned = Image.open(path).convert("RGBA")
    assert cleaned.getpixel((3, 3))[3] == 255


def test_cleanup_preserves_image_size(tmp_path):
    path = tmp_path / "size.png"
    _save_test_texture(path)

    cleanup_runtime_vfx_texture(str(path))

    assert Image.open(path).size == (8, 8)


def test_cleanup_handles_rgba_image(tmp_path):
    path = tmp_path / "rgba.png"
    _save_test_texture(path, mode="RGBA")

    cleanup_runtime_vfx_texture(str(path))

    assert Image.open(path).mode == "RGBA"


def test_cleanup_handles_rgb_image(tmp_path):
    path = tmp_path / "rgb.png"
    _save_test_texture(path, mode="RGB")

    cleanup_runtime_vfx_texture(str(path))

    assert Image.open(path).mode == "RGBA"


def test_cleanup_does_not_fail_on_already_transparent_png(tmp_path):
    path = tmp_path / "transparent.png"
    image = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
    image.putpixel((2, 2), (255, 90, 31, 255))
    image.save(path, format="PNG")

    cleanup_runtime_vfx_texture(str(path))

    cleaned = Image.open(path).convert("RGBA")
    assert cleaned.getpixel((0, 0))[3] == 0
    assert cleaned.getpixel((2, 2))[3] == 255


def test_missing_file_path_raises_controlled_error(tmp_path):
    with pytest.raises(RuntimeVfxImagePostprocessError):
        cleanup_runtime_vfx_texture(str(tmp_path / "missing.png"))

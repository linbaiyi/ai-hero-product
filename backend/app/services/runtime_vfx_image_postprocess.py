from pathlib import Path

from PIL import Image


class RuntimeVfxImagePostprocessError(RuntimeError):
    pass


def cleanup_runtime_vfx_texture(input_path: str, output_path: str | None = None) -> str:
    source_path = Path(input_path)
    target_path = Path(output_path) if output_path else source_path

    try:
        with Image.open(source_path) as image:
            cleaned = remove_light_gray_background(image.convert("RGBA"))
            cleaned = remove_checkerboard_background(cleaned)
            cleaned.save(target_path, format="PNG")
    except Exception as exc:
        raise RuntimeVfxImagePostprocessError(
            f"Runtime VFX texture alpha cleanup failed: {source_path}"
        ) from exc

    return str(target_path)


def remove_checkerboard_background(image: Image.Image) -> Image.Image:
    return _remove_background_pixels(image.convert("RGBA"))


def remove_light_gray_background(image: Image.Image) -> Image.Image:
    return _remove_background_pixels(image.convert("RGBA"))


def _remove_background_pixels(image: Image.Image) -> Image.Image:
    pixels = []
    for red, green, blue, alpha in image.getdata():
        if alpha < 8:
            pixels.append((red, green, blue, 0))
            continue

        if _is_light_neutral_background(red, green, blue) or _is_dark_neutral_background(
            red, green, blue
        ):
            pixels.append((red, green, blue, 0))
            continue

        pixels.append((red, green, blue, alpha))

    cleaned = Image.new("RGBA", image.size)
    cleaned.putdata(pixels)
    return cleaned


def _is_light_neutral_background(red: int, green: int, blue: int) -> bool:
    return (
        red > 220
        and green > 220
        and blue > 220
        and max(red, green, blue) - min(red, green, blue) < 30
    )


def _is_dark_neutral_background(red: int, green: int, blue: int) -> bool:
    return (
        red <= 18
        and green <= 18
        and blue <= 18
        and max(red, green, blue) - min(red, green, blue) < 16
    )

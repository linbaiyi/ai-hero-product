import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


class FakeImageClient:
    def generate_image(
        self,
        prompt: str,
        negative_prompt: str | None,
        save_path: str,
        width: int,
        height: int,
    ) -> str:
        output_path = Path(save_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        palette = _pick_palette(prompt)
        image = Image.new("RGB", (width, height), palette["background"])
        glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow, "RGBA")

        center_x = width // 2
        center_y = height // 2
        radius = max(32, min(width, height) // 4)

        for index in range(9):
            alpha = max(18, 130 - index * 12)
            current_radius = radius + index * max(8, radius // 8)
            draw.ellipse(
                (
                    center_x - current_radius,
                    center_y - current_radius,
                    center_x + current_radius,
                    center_y + current_radius,
                ),
                outline=(*palette["secondary"], alpha),
                width=max(2, radius // 18),
            )

        for index in range(24):
            angle = (math.tau / 24) * index
            inner = radius * 0.35
            outer = radius * (1.25 + (index % 4) * 0.18)
            start = (
                center_x + math.cos(angle) * inner,
                center_y + math.sin(angle) * inner,
            )
            end = (
                center_x + math.cos(angle) * outer,
                center_y + math.sin(angle) * outer,
            )
            draw.line([start, end], fill=(*palette["main"], 150), width=3)

        for index in range(80):
            angle = (index * 137.5) * math.pi / 180
            distance = (index % 23) / 23 * radius * 1.7
            x = center_x + math.cos(angle) * distance
            y = center_y + math.sin(angle) * distance
            size = 2 + (index % 5)
            draw.ellipse(
                (x - size, y - size, x + size, y + size),
                fill=(*palette["accent"], 170),
            )

        draw.ellipse(
            (
                center_x - radius * 0.48,
                center_y - radius * 0.48,
                center_x + radius * 0.48,
                center_y + radius * 0.48,
            ),
            fill=(*palette["main"], 210),
        )

        blurred = glow.filter(ImageFilter.GaussianBlur(radius=max(4, radius // 10)))
        image = Image.alpha_composite(image.convert("RGBA"), blurred)
        image = Image.alpha_composite(image, glow)

        text_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        text_draw = ImageDraw.Draw(text_layer)
        font = ImageFont.load_default()
        label = "VFX PREVIEW"
        text_bbox = text_draw.textbbox((0, 0), label, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_draw.text(
            ((width - text_width) / 2, height - 42),
            label,
            fill=(235, 226, 205, 180),
            font=font,
        )
        image = Image.alpha_composite(image, text_layer)

        image.convert("RGB").save(output_path, format="PNG")
        return str(output_path)


def _pick_palette(prompt: str) -> dict[str, tuple[int, int, int]]:
    normalized = prompt.lower()

    if any(word in normalized for word in ["fire", "ember", "explosion", "burning"]):
        return {
            "background": (13, 6, 4),
            "main": (255, 90, 31),
            "secondary": (255, 193, 90),
            "accent": (255, 232, 150),
        }

    if any(word in normalized for word in ["ice", "frost", "crystal", "freezing"]):
        return {
            "background": (5, 14, 23),
            "main": (125, 220, 255),
            "secondary": (216, 246, 255),
            "accent": (156, 235, 255),
        }

    if any(word in normalized for word in ["shadow", "dark mist", "afterimage"]):
        return {
            "background": (5, 3, 10),
            "main": (109, 76, 255),
            "secondary": (44, 26, 78),
            "accent": (188, 160, 255),
        }

    return {
        "background": (8, 8, 13),
        "main": (236, 176, 64),
        "secondary": (255, 218, 122),
        "accent": (255, 239, 181),
    }

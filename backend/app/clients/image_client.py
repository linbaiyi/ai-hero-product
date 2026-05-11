from typing import Protocol


class ImageClient(Protocol):
    def generate_image(
        self,
        prompt: str,
        negative_prompt: str | None,
        save_path: str,
        width: int,
        height: int,
    ) -> str:
        """Generate an image at save_path and return the saved path."""
        ...

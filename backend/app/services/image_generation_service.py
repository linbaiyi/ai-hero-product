from datetime import datetime

from app.clients.image_client import ImageClient
from app.schemas.image_generation_schema import (
    ImageGenerationBatchRequest,
    ImageGenerationRequest,
    ImageGenerationResult,
)
from app.schemas.image_prompt_schema import ImagePromptResult
from app.storage.file_storage import (
    get_image_output_dir,
    sanitize_file_name,
    sanitize_project_id,
    to_backend_relative_path,
)


class ImageGenerationService:
    def __init__(self, image_client: ImageClient) -> None:
        self.image_client = image_client

    def generate_for_prompt(
        self, req: ImageGenerationRequest
    ) -> ImageGenerationResult:
        project_id = _resolve_project_id(req.project_id)
        return self._generate_one(req.image_prompt, project_id, req.width, req.height)

    def generate_for_prompt_batch(
        self, req: ImageGenerationBatchRequest
    ) -> list[ImageGenerationResult]:
        project_id = _resolve_project_id(req.project_id)
        results: list[ImageGenerationResult] = []

        for index, image_prompt in enumerate(req.image_prompts, start=1):
            results.append(
                self._generate_one(
                    image_prompt,
                    project_id,
                    req.width,
                    req.height,
                    index=index,
                )
            )

        return results

    def _generate_one(
        self,
        image_prompt: ImagePromptResult,
        project_id: str,
        width: int,
        height: int,
        index: int | None = None,
    ) -> ImageGenerationResult:
        output_dir = get_image_output_dir(project_id)
        safe_skill_name = sanitize_file_name(image_prompt.skill_name)
        prefix = f"{index:02d}_" if index is not None else ""
        file_name = f"{prefix}skill_{safe_skill_name}.png"
        save_path = output_dir / file_name

        try:
            self.image_client.generate_image(
                prompt=image_prompt.prompt,
                negative_prompt=image_prompt.negative_prompt,
                save_path=str(save_path),
                width=width,
                height=height,
            )
            return ImageGenerationResult(
                skill_name=image_prompt.skill_name,
                image_path=to_backend_relative_path(save_path),
                file_name=save_path.name,
                width=width,
                height=height,
                success=True,
            )
        except Exception as exc:
            return ImageGenerationResult(
                skill_name=image_prompt.skill_name,
                image_path=to_backend_relative_path(save_path),
                file_name=save_path.name,
                width=width,
                height=height,
                success=False,
                error_message=str(exc),
            )


def _resolve_project_id(project_id: str | None) -> str:
    if project_id:
        return sanitize_project_id(project_id)

    return datetime.now().strftime("project_%Y%m%d_%H%M%S_%f")

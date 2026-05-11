import base64
import io
import time
from pathlib import Path
from typing import Any
from urllib.request import urlopen

from PIL import Image


class ApiImageClient:
    def __init__(
        self,
        provider: str,
        api_key: str,
        model: str,
        base_url: str | None = None,
        timeout: int = 120,
        max_retries: int = 1,
        openai_client: Any | None = None,
    ) -> None:
        self.provider = provider
        self.api_key = api_key
        self.model = model
        self.base_url = _normalize_base_url(base_url)
        self.timeout = timeout
        self.max_retries = max_retries
        self._openai_client = openai_client

    def generate_image(
        self,
        prompt: str,
        negative_prompt: str | None,
        save_path: str,
        width: int,
        height: int,
    ) -> str:
        if not prompt or not prompt.strip():
            raise ValueError("图像 Prompt 不能为空")

        full_prompt = prompt.strip()
        if negative_prompt and negative_prompt.strip():
            full_prompt = f"{full_prompt}\nNegative prompt: {negative_prompt.strip()}"

        response = self._generate_image_response(full_prompt, width, height)

        data = getattr(response, "data", None)
        if not data:
            raise ValueError("图像生成 API 返回内容为空")

        item = data[0]
        b64_json = getattr(item, "b64_json", None)
        url = getattr(item, "url", None)

        if b64_json:
            try:
                image_bytes = base64.b64decode(b64_json)
            except Exception as exc:
                raise RuntimeError(f"图像数据解码失败：{exc}") from exc
        elif url:
            image_bytes = self._download_image_bytes(str(url))
        else:
            raise ValueError("图像生成 API 返回内容为空")

        self._save_png(image_bytes, save_path)
        return save_path

    def _client(self) -> Any:
        if self._openai_client is not None:
            return self._openai_client

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("openai 依赖未安装，无法调用真实图像生成 API。") from exc

        kwargs: dict[str, Any] = {
            "api_key": self.api_key,
            "timeout": self.timeout,
            "max_retries": self.max_retries,
        }
        if self.base_url:
            kwargs["base_url"] = self.base_url

        self._openai_client = OpenAI(**kwargs)
        return self._openai_client

    def _generate_image_response(self, prompt: str, width: int, height: int) -> Any:
        attempts = max(1, self.max_retries + 1)
        last_exc: Exception | None = None

        for attempt in range(attempts):
            try:
                return self._client().images.generate(
                    model=self.model,
                    prompt=prompt,
                    size=f"{width}x{height}",
                    n=1,
                )
            except Exception as exc:
                last_exc = exc
                if attempt >= attempts - 1 or not _is_transient_image_error(exc):
                    break
                time.sleep(min(2.0, 0.5 * (attempt + 1)))

        raise RuntimeError(f"真实图像生成 API 调用失败：{last_exc}") from last_exc

    def _download_image_bytes(self, url: str) -> bytes:
        try:
            with urlopen(url, timeout=self.timeout) as response:
                return response.read()
        except Exception as exc:
            raise RuntimeError(f"图像数据解码失败：{exc}") from exc

    def _save_png(self, image_bytes: bytes, save_path: str) -> None:
        try:
            output_path = Path(save_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(io.BytesIO(image_bytes)) as image:
                image.convert("RGB").save(output_path, format="PNG")
        except Exception as exc:
            raise RuntimeError(f"图像数据解码失败：{exc}") from exc


def _normalize_base_url(base_url: str | None) -> str | None:
    if not base_url or not base_url.strip():
        return None

    normalized = base_url.strip().rstrip("/")
    endpoint_suffix = "/images/generations"
    if normalized.endswith(endpoint_suffix):
        normalized = normalized[: -len(endpoint_suffix)].rstrip("/")
    return normalized or None


def _is_transient_image_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(
        marker in text
        for marker in [
            "502",
            "503",
            "504",
            "connection error",
            "connection",
            "timeout",
            "timed out",
            "upstream",
            "temporarily",
        ]
    )

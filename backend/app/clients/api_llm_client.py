import json
from typing import Any

from pydantic import ValidationError

from app.schemas.hero_schema import HeroDesign
from app.schemas.image_prompt_schema import ImagePromptResult
from app.schemas.playable_schema import HeroPlayableSpec
from app.schemas.vfx_schema import VfxDesign


class ApiLLMClient:
    def __init__(
        self,
        provider: str,
        api_key: str,
        model: str,
        base_url: str | None = None,
        timeout: int = 60,
        max_retries: int = 2,
        openai_client: Any | None = None,
    ) -> None:
        self.provider = provider
        self.api_key = api_key
        self.model = model
        self.base_url = base_url or None
        self.timeout = timeout
        self.max_retries = max_retries
        self._openai_client = openai_client

    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        schema_model = _schema_model_for_name(schema_name)
        last_error: Exception | None = None

        for current_prompt in [prompt, _build_json_retry_prompt(prompt, schema_name)]:
            try:
                if self.provider == "openai_compatible":
                    response = self._create_chat_completion(
                        current_prompt,
                        schema_name,
                        schema_model,
                    )
                else:
                    response = self._create_response(
                        current_prompt,
                        schema_name,
                        schema_model,
                    )
            except Exception as exc:
                raise RuntimeError(f"真实大模型 API 调用失败：{exc}") from exc

            text = _extract_output_text(response)
            if not text or not text.strip():
                last_error = ValueError("大模型返回内容为空")
                continue

            try:
                data = json.loads(_extract_json_payload(text.strip()))
            except json.JSONDecodeError as exc:
                last_error = ValueError("大模型返回的 JSON 无法解析")
                continue

            try:
                return schema_model.model_validate(data).model_dump()
            except ValidationError as exc:
                last_error = ValueError("大模型返回的 JSON 不符合目标 Schema")

        if isinstance(last_error, ValueError):
            raise last_error
        raise ValueError("大模型返回的 JSON 无法解析")

    def _client(self) -> Any:
        if self._openai_client is not None:
            return self._openai_client

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("openai 依赖未安装，无法调用真实大模型 API。") from exc

        kwargs: dict[str, Any] = {
            "api_key": self.api_key,
            "timeout": self.timeout,
            "max_retries": self.max_retries,
        }
        if self.base_url:
            kwargs["base_url"] = self.base_url

        self._openai_client = OpenAI(**kwargs)
        return self._openai_client

    def _create_response(self, prompt: str, schema_name: str | None, schema_model: Any) -> Any:
        return self._client().responses.create(
            model=self.model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are a strict JSON generation engine. Return only valid JSON. "
                        "Do not output Markdown, code fences, comments, or explanations."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": schema_name or "json_schema",
                    "schema": schema_model.model_json_schema(),
                    "strict": True,
                }
            },
            timeout=self.timeout,
        )

    def _create_chat_completion(self, prompt: str, schema_name: str | None, schema_model: Any) -> Any:
        schema_json = json.dumps(schema_model.model_json_schema(), ensure_ascii=False)
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a strict JSON generation engine. Return only valid JSON. "
                    "Do not output Markdown, code fences, comments, or explanations. "
                    f"Your output must conform to this JSON Schema named {schema_name}: {schema_json}"
                ),
            },
            {"role": "user", "content": prompt},
        ]
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": 0,
            "timeout": self.timeout,
        }

        try:
            return self._client().chat.completions.create(
                **kwargs,
                response_format={"type": "json_object"},
            )
        except Exception as exc:
            message = str(exc).lower()
            if "response_format" not in message and "json_object" not in message:
                raise
            return self._client().chat.completions.create(**kwargs)


def _schema_model_for_name(schema_name: str | None):
    if schema_name == "hero_design":
        return HeroDesign
    if schema_name == "vfx_design":
        return VfxDesign
    if schema_name == "image_prompt":
        return ImagePromptResult
    if schema_name == "playable_spec":
        return HeroPlayableSpec
    raise ValueError(f"不支持的 schema_name: {schema_name}")


def _extract_output_text(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if output_text:
        return str(output_text)

    output = getattr(response, "output", None)
    if output:
        chunks: list[str] = []
        for item in output:
            for content in getattr(item, "content", []) or []:
                text = getattr(content, "text", None)
                if text:
                    chunks.append(str(text))
        if chunks:
            return "\n".join(chunks)

    choices = getattr(response, "choices", None)
    if choices:
        message = getattr(choices[0], "message", None)
        content = getattr(message, "content", None)
        if content:
            return str(content)

    return ""


def _strip_code_fence(text: str) -> str:
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return text


def _build_json_retry_prompt(prompt: str, schema_name: str | None) -> str:
    return (
        f"{prompt}\n\n"
        "The previous response may be rejected by strict JSON parsing. "
        f"Return exactly one JSON object for schema {schema_name or 'json_schema'}. "
        "Do not include Markdown, explanations, comments, extra wrapper objects, "
        "or any fields not required by the schema. Start with { and end with }."
    )


def _extract_json_payload(text: str) -> str:
    stripped = _strip_code_fence(text.strip())
    if stripped.startswith("{") or stripped.startswith("["):
        return stripped

    start_candidates = [
        index
        for index in (stripped.find("{"), stripped.find("["))
        if index >= 0
    ]
    if not start_candidates:
        return stripped

    start = min(start_candidates)
    opening = stripped[start]
    closing = "}" if opening == "{" else "]"
    depth = 0
    in_string = False
    escaped = False

    for index in range(start, len(stripped)):
        char = stripped[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == opening:
            depth += 1
        elif char == closing:
            depth -= 1
            if depth == 0:
                return stripped[start : index + 1]

    return stripped[start:]

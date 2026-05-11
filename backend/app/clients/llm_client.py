from typing import Protocol


class LLMClient(Protocol):
    def generate_json(self, prompt: str, schema_name: str | None = None) -> dict:
        ...

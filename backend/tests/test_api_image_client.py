import base64
from pathlib import Path
from types import SimpleNamespace

import pytest
from PIL import Image

from app.clients.api_image_client import ApiImageClient


def png_bytes() -> bytes:
    import io

    buffer = io.BytesIO()
    Image.new("RGB", (12, 10), (255, 90, 31)).save(buffer, "PNG")
    return buffer.getvalue()


def make_response_with_b64(data: str):
    return SimpleNamespace(data=[SimpleNamespace(b64_json=data)])


def make_response_with_url(url: str):
    return SimpleNamespace(data=[SimpleNamespace(url=url)])


class FakeImages:
    def __init__(self, response=None, error: Exception | None = None):
        self.response = response
        self.error = error
        self.request_kwargs = None

    def generate(self, **kwargs):
        self.request_kwargs = kwargs
        if self.error:
            raise self.error
        return self.response


class FlakyImages:
    def __init__(self, errors: list[Exception], response):
        self.errors = list(errors)
        self.response = response
        self.calls = 0

    def generate(self, **kwargs):
        self.calls += 1
        if self.errors:
            raise self.errors.pop(0)
        return self.response


def make_client(fake_images: FakeImages, **kwargs) -> ApiImageClient:
    return ApiImageClient(
        provider="openai",
        api_key="test-key",
        model="image-model",
        openai_client=SimpleNamespace(images=fake_images),
        **kwargs,
    )


def test_openai_provider_has_no_base_url():
    client = ApiImageClient(provider="openai", api_key="key", model="model")

    assert client.base_url is None


def test_openai_compatible_keeps_base_url():
    client = ApiImageClient(
        provider="openai_compatible",
        api_key="key",
        model="model",
        base_url="https://example.com/v1",
    )

    assert client.base_url == "https://example.com/v1"


def test_openai_compatible_normalizes_full_image_endpoint_base_url():
    client = ApiImageClient(
        provider="openai_compatible",
        api_key="key",
        model="model",
        base_url="https://example.com/v1/images/generations",
    )

    assert client.base_url == "https://example.com/v1"


def test_empty_prompt_raises_value_error(tmp_path):
    client = make_client(FakeImages())

    with pytest.raises(ValueError, match="图像 Prompt 不能为空"):
        client.generate_image("", None, str(tmp_path / "out.png"), 256, 256)


def test_b64_json_response_saves_png(tmp_path):
    encoded = base64.b64encode(png_bytes()).decode("utf-8")
    fake_images = FakeImages(make_response_with_b64(encoded))
    client = make_client(fake_images)
    save_path = tmp_path / "out.png"

    result = client.generate_image(
        "fire orb game VFX concept art",
        "text, logo",
        str(save_path),
        1024,
        1024,
    )

    assert result == str(save_path)
    assert save_path.exists()
    with Image.open(save_path) as image:
        assert image.format == "PNG"
        assert image.size[0] > 0
    assert fake_images.request_kwargs["model"] == "image-model"
    assert fake_images.request_kwargs["size"] == "1024x1024"
    assert "Negative prompt: text, logo" in fake_images.request_kwargs["prompt"]


def test_url_response_downloads_and_saves_png(tmp_path):
    fake_images = FakeImages(make_response_with_url("https://example.com/image.png"))
    client = make_client(fake_images)
    client._download_image_bytes = lambda url: png_bytes()
    save_path = tmp_path / "url.png"

    client.generate_image("ice orb game VFX concept art", None, str(save_path), 512, 512)

    with Image.open(save_path) as image:
        assert image.format == "PNG"
        assert image.size[0] > 0


def test_empty_data_raises_value_error(tmp_path):
    client = make_client(FakeImages(SimpleNamespace(data=[])))

    with pytest.raises(ValueError, match="图像生成 API 返回内容为空"):
        client.generate_image("prompt", None, str(tmp_path / "out.png"), 256, 256)


def test_invalid_b64_data_raises_runtime_error(tmp_path):
    client = make_client(FakeImages(make_response_with_b64("not-b64")))

    with pytest.raises(RuntimeError, match="图像数据解码失败"):
        client.generate_image("prompt", None, str(tmp_path / "out.png"), 256, 256)


def test_api_exception_becomes_chinese_runtime_error(tmp_path):
    client = make_client(FakeImages(error=RuntimeError("boom")))

    with pytest.raises(RuntimeError, match="真实图像生成 API 调用失败"):
        client.generate_image("prompt", None, str(tmp_path / "out.png"), 256, 256)


def test_transient_image_error_retries_and_then_succeeds(tmp_path, monkeypatch):
    encoded = base64.b64encode(png_bytes()).decode("utf-8")
    fake_images = FlakyImages(
        errors=[RuntimeError("Error code: 502 - upstream request failed")],
        response=make_response_with_b64(encoded),
    )
    client = ApiImageClient(
        provider="openai_compatible",
        api_key="test-key",
        model="image-model",
        max_retries=2,
        openai_client=SimpleNamespace(images=fake_images),
    )
    monkeypatch.setattr("app.clients.api_image_client.time.sleep", lambda _: None)

    client.generate_image("prompt", None, str(tmp_path / "out.png"), 256, 256)

    assert fake_images.calls == 2


def test_non_transient_image_error_does_not_retry(tmp_path):
    fake_images = FlakyImages(
        errors=[RuntimeError("Error code: 400 - bad request")],
        response=make_response_with_b64("unused"),
    )
    client = ApiImageClient(
        provider="openai_compatible",
        api_key="test-key",
        model="image-model",
        max_retries=2,
        openai_client=SimpleNamespace(images=fake_images),
    )

    with pytest.raises(RuntimeError, match="真实图像生成 API 调用失败"):
        client.generate_image("prompt", None, str(tmp_path / "out.png"), 256, 256)

    assert fake_images.calls == 1

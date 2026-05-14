import re
import shutil
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = BACKEND_ROOT / "outputs"
IMAGE_OUTPUT_ROOT = OUTPUT_ROOT / "images"
BOARD_OUTPUT_ROOT = OUTPUT_ROOT / "boards"
PROJECT_OUTPUT_ROOT = OUTPUT_ROOT / "projects"
EXPORT_OUTPUT_ROOT = OUTPUT_ROOT / "exports"
RUNTIME_VFX_OUTPUT_ROOT = OUTPUT_ROOT / "runtime_vfx"


def ensure_output_dirs() -> None:
    IMAGE_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    BOARD_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    PROJECT_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    EXPORT_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    RUNTIME_VFX_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)


def sanitize_project_id(project_id: str) -> str:
    sanitized = project_id.strip().replace(" ", "_")
    sanitized = sanitized.replace("..", "")
    sanitized = re.sub(r"[\\/:\s]+", "_", sanitized)
    sanitized = re.sub(r"_+", "_", sanitized).strip("._")
    return sanitized or "default_project"


def sanitize_file_name(name: str) -> str:
    sanitized = name.strip().replace(" ", "_")
    sanitized = sanitized.replace("..", "")
    sanitized = re.sub(r"[\\/:\s]+", "_", sanitized)
    sanitized = re.sub(r"[^\w.-]+", "_", sanitized, flags=re.UNICODE)
    sanitized = re.sub(r"_+", "_", sanitized).strip("._")
    return sanitized or "image"


def get_image_output_dir(project_id: str) -> Path:
    ensure_output_dirs()
    safe_project_id = sanitize_project_id(project_id)
    output_dir = (IMAGE_OUTPUT_ROOT / safe_project_id).resolve()

    if not output_dir.is_relative_to(IMAGE_OUTPUT_ROOT.resolve()):
        raise ValueError("输出路径不允许超出 outputs 目录")

    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def get_board_output_dir(project_id: str) -> Path:
    ensure_output_dirs()
    safe_project_id = sanitize_project_id(project_id)
    output_dir = (BOARD_OUTPUT_ROOT / safe_project_id).resolve()

    if not output_dir.is_relative_to(BOARD_OUTPUT_ROOT.resolve()):
        raise ValueError("输出路径不允许超出 outputs 目录")

    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def get_project_output_dir() -> Path:
    ensure_output_dirs()
    output_dir = PROJECT_OUTPUT_ROOT.resolve()

    if not output_dir.is_relative_to(OUTPUT_ROOT.resolve()):
        raise ValueError("输出路径不允许超出 outputs 目录")

    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def get_project_file_path(project_id: str) -> Path:
    project_dir = get_project_output_dir()
    safe_project_id = sanitize_project_id(project_id)
    file_path = (project_dir / f"{safe_project_id}.json").resolve()

    if not file_path.is_relative_to(project_dir.resolve()):
        raise ValueError("项目路径不允许超出 outputs 目录")

    return file_path


def get_export_output_dir(project_id: str) -> Path:
    ensure_output_dirs()
    safe_project_id = sanitize_project_id(project_id)
    output_dir = (EXPORT_OUTPUT_ROOT / safe_project_id).resolve()

    if not output_dir.is_relative_to(EXPORT_OUTPUT_ROOT.resolve()):
        raise ValueError("导出路径不允许超出 outputs 目录")

    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def get_runtime_vfx_output_dir(relative_base: str) -> Path:
    ensure_output_dirs()
    normalized = relative_base.replace("\\", "/")
    if normalized.startswith("runtime_vfx/"):
        normalized = normalized.removeprefix("runtime_vfx/")

    safe_parts = [sanitize_project_id(part) for part in normalized.split("/") if part]
    output_dir = (RUNTIME_VFX_OUTPUT_ROOT.joinpath(*safe_parts)).resolve()

    if not output_dir.is_relative_to(RUNTIME_VFX_OUTPUT_ROOT.resolve()):
        raise ValueError("Runtime VFX output path cannot escape outputs/runtime_vfx")

    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def get_export_file_path(project_id: str) -> Path:
    export_dir = get_export_output_dir(project_id)
    safe_project_id = sanitize_project_id(project_id)
    file_path = (export_dir / f"{safe_project_id}_export.zip").resolve()

    if not file_path.is_relative_to(export_dir.resolve()):
        raise ValueError("导出文件路径不允许超出 outputs 目录")

    return file_path


def to_backend_relative_path(path: Path) -> str:
    return path.resolve().relative_to(BACKEND_ROOT).as_posix()


def resolve_output_file(file_path: str) -> Path:
    if ".." in Path(file_path).parts or ".." in file_path.replace("\\", "/").split("/"):
        raise ValueError("文件路径不允许包含上级目录")

    requested_path = (BACKEND_ROOT / file_path).resolve()

    if not requested_path.is_relative_to(OUTPUT_ROOT.resolve()):
        raise PermissionError("只能访问 outputs 目录下的文件")

    return requested_path


def resolve_runtime_vfx_file(file_path: str) -> Path:
    normalized = file_path.replace("\\", "/")
    lower = normalized.lower()
    if lower.startswith(("http://", "https://", "javascript:")):
        raise ValueError("Runtime VFX path must be a local relative path")
    if Path(normalized).is_absolute():
        raise ValueError("Runtime VFX path must not be absolute")
    if ".." in Path(normalized).parts or ".." in normalized.split("/"):
        raise ValueError("Runtime VFX path must not contain parent traversal")

    if normalized.startswith("outputs/runtime_vfx/"):
        normalized = normalized.removeprefix("outputs/")
    if not normalized.startswith("runtime_vfx/"):
        raise ValueError("Runtime VFX path must be under runtime_vfx")

    requested_path = (OUTPUT_ROOT / normalized).resolve()
    runtime_root = RUNTIME_VFX_OUTPUT_ROOT.resolve()

    if not requested_path.is_relative_to(runtime_root):
        raise PermissionError("Runtime VFX files must stay under outputs/runtime_vfx")

    return requested_path


def get_project_asset_dirs(project_id: str) -> list[Path]:
    ensure_output_dirs()
    safe_project_id = sanitize_project_id(project_id)
    asset_roots = [
        IMAGE_OUTPUT_ROOT,
        BOARD_OUTPUT_ROOT,
        EXPORT_OUTPUT_ROOT,
        RUNTIME_VFX_OUTPUT_ROOT,
    ]

    asset_dirs: list[Path] = []
    for root in asset_roots:
        target = (root / safe_project_id).resolve()
        if not target.is_relative_to(root.resolve()):
            raise ValueError("Project asset path cannot escape outputs")
        asset_dirs.append(target)

    return asset_dirs


def delete_project_asset_dirs(project_id: str) -> None:
    for asset_dir in get_project_asset_dirs(project_id):
        if asset_dir.is_dir():
            shutil.rmtree(asset_dir)

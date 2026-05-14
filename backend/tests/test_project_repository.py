import json
from pathlib import Path

import pytest

from app.schemas.project_schema import ProjectSaveRequest
from app.storage.project_repository import ProjectRepository
from project_test_helpers import (
    make_playable_spec,
    make_project_save_request,
    make_runtime_vfx_asset_spec,
)


def make_repo(tmp_path: Path, asset_roots: list[Path] | None = None) -> ProjectRepository:
    return ProjectRepository(project_dir=tmp_path, asset_roots=asset_roots)


def test_save_project_creates_json_file(tmp_path):
    repo = make_repo(tmp_path)

    record = repo.save_project(ProjectSaveRequest(**make_project_save_request()))

    assert (tmp_path / "project_demo.json").exists()
    assert record.project_id == "project_demo"


def test_get_project_reads_saved_project(tmp_path):
    repo = make_repo(tmp_path)
    repo.save_project(ProjectSaveRequest(**make_project_save_request()))

    record = repo.get_project("project_demo")

    assert record.hero_design.hero_name == "烬焰使"


def test_get_project_reads_saved_playable_spec(tmp_path):
    repo = make_repo(tmp_path)
    repo.save_project(
        ProjectSaveRequest(
            **make_project_save_request(playable_spec=make_playable_spec())
        )
    )

    record = repo.get_project("project_demo")

    assert record.playable_spec is not None
    assert record.playable_spec.hero.name == "Test Playable Hero"


def test_get_project_reads_saved_runtime_vfx_asset_spec(tmp_path):
    repo = make_repo(tmp_path)
    repo.save_project(
        ProjectSaveRequest(
            **make_project_save_request(
                runtime_vfx_asset_spec=make_runtime_vfx_asset_spec()
            )
        )
    )

    record = repo.get_project("project_demo")

    assert record.runtime_vfx_asset_spec is not None
    assert record.runtime_vfx_asset_spec.hero_id == "test_playable_hero"


def test_old_project_without_runtime_vfx_asset_spec_reads_normally(tmp_path):
    repo = make_repo(tmp_path)
    record = repo.save_project(ProjectSaveRequest(**make_project_save_request()))
    data = json.loads((tmp_path / f"{record.project_id}.json").read_text(encoding="utf-8"))
    data.pop("runtime_vfx_asset_spec", None)
    (tmp_path / f"{record.project_id}.json").write_text(
        json.dumps(data, ensure_ascii=False),
        encoding="utf-8",
    )

    loaded = repo.get_project(record.project_id)

    assert loaded.runtime_vfx_asset_spec is None


def test_legacy_project_with_invalid_runtime_vfx_asset_spec_still_reads(tmp_path):
    repo = make_repo(tmp_path)
    record = repo.save_project(
        ProjectSaveRequest(
            **make_project_save_request(
                runtime_vfx_asset_spec=make_runtime_vfx_asset_spec()
            )
        )
    )
    file_path = tmp_path / f"{record.project_id}.json"
    data = json.loads(file_path.read_text(encoding="utf-8"))
    data["runtime_vfx_asset_spec"]["skills"]["E"]["skill_type"] = "summon"
    file_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    loaded = repo.get_project(record.project_id)

    assert loaded.project_id == record.project_id
    assert loaded.runtime_vfx_asset_spec is None


def test_list_projects_includes_legacy_project_with_invalid_runtime_vfx_asset_spec(
    tmp_path,
):
    repo = make_repo(tmp_path)
    record = repo.save_project(
        ProjectSaveRequest(
            **make_project_save_request(
                runtime_vfx_asset_spec=make_runtime_vfx_asset_spec()
            )
        )
    )
    file_path = tmp_path / f"{record.project_id}.json"
    data = json.loads(file_path.read_text(encoding="utf-8"))
    data["runtime_vfx_asset_spec"]["skills"]["E"]["skill_type"] = "summon"
    file_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    projects = repo.list_projects()

    assert len(projects) == 1
    assert projects[0].project_id == record.project_id


def test_saving_same_project_updates_updated_at_and_keeps_created_at(tmp_path):
    repo = make_repo(tmp_path)
    first = repo.save_project(ProjectSaveRequest(**make_project_save_request()))
    second = repo.save_project(
        ProjectSaveRequest(**make_project_save_request(llm_provider="openai"))
    )

    assert second.created_at == first.created_at
    assert second.updated_at >= first.updated_at
    assert second.llm_provider == "openai"


def test_list_projects_returns_summaries_sorted_by_updated_at(tmp_path):
    repo = make_repo(tmp_path)
    first = repo.save_project(ProjectSaveRequest(**make_project_save_request("project_a")))
    second = repo.save_project(ProjectSaveRequest(**make_project_save_request("project_b")))

    projects = repo.list_projects()

    assert len(projects) == 2
    assert projects[0].updated_at >= projects[1].updated_at
    assert {first.project_id, second.project_id} == {p.project_id for p in projects}


def test_delete_project_removes_json_file(tmp_path):
    repo = make_repo(tmp_path)
    repo.save_project(ProjectSaveRequest(**make_project_save_request()))

    deleted = repo.delete_project("project_demo")

    assert deleted is True
    assert not (tmp_path / "project_demo.json").exists()


def test_delete_project_removes_project_asset_directories(tmp_path):
    asset_roots = [
        tmp_path / "images",
        tmp_path / "boards",
        tmp_path / "exports",
        tmp_path / "runtime_vfx",
    ]
    repo = make_repo(tmp_path / "projects", asset_roots=asset_roots)
    repo.save_project(ProjectSaveRequest(**make_project_save_request()))
    for root in asset_roots:
        asset_dir = root / "project_demo"
        asset_dir.mkdir(parents=True)
        (asset_dir / "asset.txt").write_text("asset", encoding="utf-8")

    deleted = repo.delete_project("project_demo")

    assert deleted is True
    for root in asset_roots:
        assert not (root / "project_demo").exists()


def test_delete_missing_project_does_not_remove_asset_directories(tmp_path):
    asset_root = tmp_path / "images"
    asset_dir = asset_root / "missing"
    asset_dir.mkdir(parents=True)
    (asset_dir / "asset.txt").write_text("asset", encoding="utf-8")
    repo = make_repo(tmp_path / "projects", asset_roots=[asset_root])

    deleted = repo.delete_project("missing")

    assert deleted is False
    assert asset_dir.exists()


def test_get_missing_project_raises_file_not_found(tmp_path):
    repo = make_repo(tmp_path)

    with pytest.raises(FileNotFoundError):
        repo.get_project("missing")


def test_unsafe_project_id_does_not_escape_project_dir(tmp_path):
    repo = make_repo(tmp_path)

    record = repo.save_project(
        ProjectSaveRequest(**make_project_save_request("../unsafe:path"))
    )

    assert ".." not in record.project_id
    assert (tmp_path / f"{record.project_id}.json").resolve().is_relative_to(
        tmp_path.resolve()
    )


def test_list_projects_skips_corrupted_json(tmp_path):
    repo = make_repo(tmp_path)
    repo.save_project(ProjectSaveRequest(**make_project_save_request("project_ok")))
    (tmp_path / "broken.json").write_text("{not-json", encoding="utf-8")

    projects = repo.list_projects()

    assert len(projects) == 1
    assert projects[0].project_id == "project_ok"

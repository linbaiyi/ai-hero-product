import pytest

from app.prompts.image_prompts import (
    VFX_TEXTURE_RESOURCE_TYPES,
    build_vfx_texture_prompt,
    generate_texture_prompts_for_skill,
    get_texture_resource_types_for_skill_type,
)


REQUIRED_TERMS = [
    "transparent background",
    "suitable for Three.js or Babylon.js",
    "no text",
    "no logo",
    "no watermark",
]


@pytest.mark.parametrize("resource_type", VFX_TEXTURE_RESOURCE_TYPES)
def test_each_resource_type_template_formats(resource_type: str):
    prompt = build_vfx_texture_prompt(
        resource_type=resource_type,
        skill_name="Flame Strike",
        element="fire",
        keywords=["orange flame", "arcane energy"],
    )

    assert "Flame Strike" in prompt
    assert "fire element" in prompt
    for term in REQUIRED_TERMS:
        assert term in prompt


@pytest.mark.parametrize(
    ("skill_type", "expected"),
    [
        ("projectile", {"projectile", "trail", "impact", "particle"}),
        ("aoe", {"ground_decal", "impact", "particle"}),
        ("aoe_dot", {"ground_decal", "aura", "particle"}),
        ("dash", {"trail", "impact", "particle"}),
        ("buff", {"aura", "particle"}),
        ("beam", {"beam", "impact", "particle"}),
        ("summon", {"summon_body", "aura", "impact", "particle"}),
    ],
)
def test_skill_type_maps_to_expected_resources(skill_type: str, expected: set[str]):
    assert set(get_texture_resource_types_for_skill_type(skill_type)) == expected


def test_generate_texture_prompts_for_skill_returns_expected_keys():
    result = generate_texture_prompts_for_skill(
        skill_name="Flame Bolt",
        skill_type="projectile",
        element="fire",
        keywords=["bright core", "orange sparks"],
    )

    assert result["skill_name"] == "Flame Bolt"
    assert set(result["prompts"]) == {"projectile", "trail", "impact", "particle"}
    assert "negative_prompt" in result
    for prompt in result["prompts"].values():
        for term in REQUIRED_TERMS:
            assert term in prompt


def test_generate_texture_prompts_for_skill_supports_explicit_resource_types():
    result = generate_texture_prompts_for_skill(
        skill_name="Holy Ray",
        skill_type="beam",
        element="holy",
        keywords="golden beam",
        resource_types=["beam"],
    )

    assert set(result["prompts"]) == {"beam"}
    assert "beam rendering" in result["prompts"]["beam"]


def test_summon_skill_generates_summon_body_prompt():
    result = generate_texture_prompts_for_skill(
        skill_name="Flame Spirit",
        skill_type="summon",
        element="fire",
        keywords=["small fire guardian", "readable silhouette"],
    )

    assert "summon_body" in result["prompts"]
    prompt = result["prompts"]["summon_body"]
    assert "summoned creature sprite" in prompt
    assert "billboard sprite rendering" in prompt
    for term in REQUIRED_TERMS:
        assert term in prompt

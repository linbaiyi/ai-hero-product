import type {
  RuntimeVfxAssetEntry,
  RuntimeVfxAction,
  RuntimeVfxAssetSpec,
  RuntimeVfxBlendMode,
  RuntimeVfxRenderMode,
  RuntimeVfxSkillSpec,
  RuntimeVfxSkillType,
  RuntimeVfxSlot,
  RuntimeVfxSpawnOffset,
  RuntimeVfxTrigger,
  RuntimeVfxUsage,
} from "./runtimeVfxTypes";

export type ValidationResult<T> =
  | { success: true; data: T; errors: [] }
  | { success: false; data?: undefined; errors: string[] };

const RUNTIME_VFX_SLOTS = ["Q", "W", "E", "R"] as const;
const RUNTIME_VFX_SKILL_TYPES = [
  "projectile",
  "aoe",
  "aoe_dot",
  "dash",
  "buff",
  "summon",
] as const;
const RUNTIME_VFX_USAGES = [
  "projectile",
  "impact",
  "ground_decal",
  "aura",
  "trail",
  "summon_body",
  "cast_flash",
  "cast_circle",
  "zone_tick",
  "summon_spawn",
  "summon_idle",
  "summon_expire",
  "status_loop",
  "burn_loop",
  "poison_cloud",
  "mark_sigil",
  "mark_sigial",
  "stun_stars",
] as const;
const RUNTIME_VFX_RENDER_MODES = [
  "sprite",
  "ground_plane",
  "billboard_plane",
  "sprite_trail",
  "aura_ring",
] as const;
const RUNTIME_VFX_BLEND_MODES = ["alpha", "additive", "normal"] as const;
const RUNTIME_VFX_TRIGGERS = [
  "on_cast",
  "on_projectile_hit",
  "on_zone_tick",
  "on_zone_expire",
  "on_summon_attack",
  "on_summon_expire",
  "on_summon_death",
  "on_status_tick",
  "on_status_expire",
] as const;
const RUNTIME_VFX_ACTIONS = [
  "damage",
  "aoe_damage",
  "apply_status",
  "spawn_zone",
  "summon",
  "spawn_projectile",
  "spawn_vfx_event",
] as const;

export const runtimeVfxAssetSchema = {
  slots: RUNTIME_VFX_SLOTS,
  skill_types: RUNTIME_VFX_SKILL_TYPES,
  usages: RUNTIME_VFX_USAGES,
  render_modes: RUNTIME_VFX_RENDER_MODES,
  blend_modes: RUNTIME_VFX_BLEND_MODES,
  triggers: RUNTIME_VFX_TRIGGERS,
  actions: RUNTIME_VFX_ACTIONS,
};

export function validateRuntimeVfxAssetSpec(
  input: unknown,
): ValidationResult<RuntimeVfxAssetSpec> {
  const errors: string[] = [];
  const root = objectValue(input, "spec", errors);
  if (!root) {
    return { success: false, errors };
  }

  if (root.version !== "1.0") {
    errors.push("version must be 1.0");
  }

  const hero_id = requiredText(root.hero_id, "hero_id", errors);
  const assets_base_path = requiredText(
    root.assets_base_path,
    "assets_base_path",
    errors,
  );
  const skills = validateSkills(root.skills, errors);

  if (root.map_profile !== "default_training_arena") {
    errors.push("map_profile must be default_training_arena");
  }

  if (!hero_id || !assets_base_path || !skills || errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      version: "1.0",
      hero_id,
      map_profile: "default_training_arena",
      assets_base_path,
      skills,
    },
    errors: [],
  };
}

export function assertRuntimeVfxAssetSpec(
  input: unknown,
): RuntimeVfxAssetSpec {
  const result = validateRuntimeVfxAssetSpec(input);
  if (!result.success) {
    throw new Error(
      `Invalid RuntimeVfxAssetSpec: ${result.errors.join("; ")}`,
    );
  }
  return result.data;
}

export function isRuntimeVfxAssetSpec(
  input: unknown,
): input is RuntimeVfxAssetSpec {
  return validateRuntimeVfxAssetSpec(input).success;
}

function validateSkills(
  input: unknown,
  errors: string[],
): Record<RuntimeVfxSlot, RuntimeVfxSkillSpec> | null {
  const skills = objectValue(input, "skills", errors);
  if (!skills) {
    return null;
  }

  const keys = Object.keys(skills);
  for (const slot of RUNTIME_VFX_SLOTS) {
    if (!keys.includes(slot)) {
      errors.push(`skills must contain ${slot}`);
    }
  }
  for (const key of keys) {
    if (!RUNTIME_VFX_SLOTS.includes(key as RuntimeVfxSlot)) {
      errors.push(`skills must not contain unknown slot ${key}`);
    }
  }

  const result: Partial<Record<RuntimeVfxSlot, RuntimeVfxSkillSpec>> = {};
  for (const slot of RUNTIME_VFX_SLOTS) {
    if (slot in skills) {
      const skill = validateSkill(skills[slot], `skills.${slot}`, errors);
      if (skill) {
        result[slot] = skill;
      }
    }
  }

  return errors.length > 0
    ? null
    : (result as Record<RuntimeVfxSlot, RuntimeVfxSkillSpec>);
}

function validateSkill(
  input: unknown,
  path: string,
  errors: string[],
): RuntimeVfxSkillSpec | null {
  const skill = objectValue(input, path, errors);
  if (!skill) {
    return null;
  }

  const skill_name = requiredText(skill.skill_name, `${path}.skill_name`, errors);
  const skill_type = enumValue<RuntimeVfxSkillType>(
    skill.skill_type,
    RUNTIME_VFX_SKILL_TYPES,
    `${path}.skill_type`,
    errors,
  );
  const assets = validateAssets(skill.assets, `${path}.assets`, errors);

  if (skill_type && assets) {
    validateMinimumAssetsForSkillType(skill_type, assets, path, errors);
  }

  if (!skill_name || !skill_type || !assets || errors.length > 0) {
    return null;
  }

  return { skill_name, skill_type, assets };
}

function validateAssets(
  input: unknown,
  path: string,
  errors: string[],
): Record<string, RuntimeVfxAssetEntry> | null {
  const assets = objectValue(input, path, errors);
  if (!assets) {
    return null;
  }

  const keys = Object.keys(assets);
  if (keys.length === 0) {
    errors.push(`${path} must contain at least one asset`);
  }

  const result: Record<string, RuntimeVfxAssetEntry> = {};
  for (const key of keys) {
    const asset = validateAsset(assets[key], `${path}.${key}`, errors);
    if (asset) {
      result[key] = asset;
    }
  }

  return errors.length > 0 ? null : result;
}

function validateAsset(
  input: unknown,
  path: string,
  errors: string[],
): RuntimeVfxAssetEntry | null {
  const asset = objectValue(input, path, errors);
  if (!asset) {
    return null;
  }

  const asset_path = requiredText(asset.path, `${path}.path`, errors);
  const usage = enumValue<RuntimeVfxUsage>(
    asset.usage,
    RUNTIME_VFX_USAGES,
    `${path}.usage`,
    errors,
  );
  const blend_mode = enumValue<RuntimeVfxBlendMode>(
    asset.blend_mode,
    RUNTIME_VFX_BLEND_MODES,
    `${path}.blend_mode`,
    errors,
  );
  const render_mode = enumValue<RuntimeVfxRenderMode>(
    asset.render_mode,
    RUNTIME_VFX_RENDER_MODES,
    `${path}.render_mode`,
    errors,
  );
  const scale = positiveNumber(asset.scale, `${path}.scale`, errors);
  const duration = nonNegativeNumber(asset.duration, `${path}.duration`, errors);
  const loop = optionalLoop(asset.loop, `${path}.loop`, errors);
  const color_tint = optionalHexColor(
    asset.color_tint,
    `${path}.color_tint`,
    errors,
  );
  const opacity = optionalNumber(asset.opacity, `${path}.opacity`, errors);
  const rotation_speed = optionalNumber(
    asset.rotation_speed,
    `${path}.rotation_speed`,
    errors,
  );
  const spawn_offset = optionalSpawnOffset(
    asset.spawn_offset,
    `${path}.spawn_offset`,
    errors,
  );
  const follow_target = optionalText(
    asset.follow_target,
    `${path}.follow_target`,
    errors,
  );
  const trigger = optionalEnumValue<RuntimeVfxTrigger>(
    asset.trigger,
    RUNTIME_VFX_TRIGGERS,
    `${path}.trigger`,
    errors,
  );
  const action = optionalEnumValue<RuntimeVfxAction>(
    asset.action,
    RUNTIME_VFX_ACTIONS,
    `${path}.action`,
    errors,
  );
  const effect_index = optionalNonNegativeInteger(
    asset.effect_index,
    `${path}.effect_index`,
    errors,
  );

  if (asset_path) {
    validateSafeAssetPath(asset_path, `${path}.path`, errors);
  }
  if (usage && render_mode) {
    validateUsageRenderMode(usage, render_mode, path, errors);
  }
  if (opacity !== undefined && opacity !== null && (opacity < 0 || opacity > 1)) {
    errors.push(`${path}.opacity must be between 0 and 1`);
  }

  if (
    !asset_path ||
    !usage ||
    !blend_mode ||
    !render_mode ||
    scale === null ||
    duration === null ||
    loop === null ||
    color_tint === null ||
    opacity === null ||
    rotation_speed === null ||
    spawn_offset === null ||
    follow_target === null ||
    trigger === null ||
    action === null ||
    effect_index === null
  ) {
    return null;
  }

  return omitUndefined({
    path: asset_path,
    usage,
    blend_mode,
    render_mode,
    scale,
    duration,
    loop,
    color_tint,
    opacity,
    rotation_speed,
    spawn_offset,
    follow_target,
    trigger,
    action,
    effect_index,
  });
}

function validateUsageRenderMode(
  usage: RuntimeVfxUsage,
  renderMode: RuntimeVfxRenderMode,
  path: string,
  errors: string[],
) {
  const allowedByUsage: Record<RuntimeVfxUsage, RuntimeVfxRenderMode[]> = {
    projectile: ["sprite", "billboard_plane"],
    impact: ["sprite", "billboard_plane"],
    ground_decal: ["ground_plane"],
    aura: ["aura_ring", "ground_plane"],
    trail: ["sprite_trail", "sprite"],
    summon_body: ["sprite", "billboard_plane"],
    cast_flash: ["sprite", "billboard_plane"],
    cast_circle: ["ground_plane", "aura_ring"],
    zone_tick: ["ground_plane", "sprite", "billboard_plane"],
    summon_spawn: ["sprite", "billboard_plane"],
    summon_idle: ["sprite", "billboard_plane", "aura_ring"],
    summon_expire: ["sprite", "billboard_plane"],
    status_loop: ["sprite", "billboard_plane", "ground_plane"],
    burn_loop: ["sprite", "billboard_plane", "ground_plane"],
    poison_cloud: ["sprite", "billboard_plane", "ground_plane"],
    mark_sigil: ["sprite", "billboard_plane", "ground_plane"],
    mark_sigial: ["sprite", "billboard_plane", "ground_plane"],
    stun_stars: ["sprite", "billboard_plane"],
  };

  if (!allowedByUsage[usage].includes(renderMode)) {
    errors.push(`${path}.render_mode is not valid for usage ${usage}`);
  }
}

function validateMinimumAssetsForSkillType(
  skillType: RuntimeVfxSkillType,
  assets: Record<string, RuntimeVfxAssetEntry>,
  path: string,
  errors: string[],
) {
  const usages = Object.values(assets).map((asset) => asset.usage);
  const hasUsage = (usage: RuntimeVfxUsage) => usages.includes(usage);

  if (skillType === "projectile" && !hasUsage("projectile") && !hasUsage("cast_flash")) {
    errors.push(`${path} projectile skill must include a projectile asset`);
  }
  if (
    skillType === "aoe" &&
    !hasUsage("ground_decal") &&
    !hasUsage("impact") &&
    !hasUsage("cast_circle")
  ) {
    errors.push(`${path} aoe skill must include ground_decal or impact`);
  }
  if (skillType === "aoe_dot" && !hasUsage("ground_decal")) {
    errors.push(`${path} aoe_dot skill must include a ground_decal asset`);
  }
  if (skillType === "dash" && !hasUsage("trail") && !hasUsage("impact")) {
    errors.push(`${path} dash skill must include trail or impact`);
  }
  if (skillType === "buff" && !hasUsage("aura")) {
    errors.push(`${path} buff skill must include an aura asset`);
  }
  if (skillType === "summon" && !hasUsage("summon_body") && !hasUsage("summon_spawn")) {
    errors.push(`${path} summon skill must include summon_body`);
  }
}

function validateSafeAssetPath(pathValue: string, path: string, errors: string[]) {
  const lowerPath = pathValue.toLowerCase();
  if (
    lowerPath.startsWith("http://") ||
    lowerPath.startsWith("https://") ||
    lowerPath.startsWith("javascript:")
  ) {
    errors.push(`${path} must be a local relative asset path`);
  }
  if (pathValue.split(/[\\/]+/).includes("..")) {
    errors.push(`${path} must not contain parent directory traversal`);
  }
}

function objectValue(
  input: unknown,
  path: string,
  errors: string[],
): Record<string, unknown> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  return input as Record<string, unknown>;
}

function requiredText(
  input: unknown,
  path: string,
  errors: string[],
): string | null {
  if (typeof input !== "string") {
    errors.push(`${path} must be a string`);
    return null;
  }
  const value = input.trim();
  if (!value) {
    errors.push(`${path} must not be blank`);
    return null;
  }
  return value;
}

function optionalText(
  input: unknown,
  path: string,
  errors: string[],
): string | undefined | null {
  if (input === undefined || input === null) {
    return undefined;
  }
  return requiredText(input, path, errors);
}

function optionalHexColor(
  input: unknown,
  path: string,
  errors: string[],
): string | undefined | null {
  if (input === undefined || input === null) {
    return undefined;
  }
  const value = requiredText(input, path, errors);
  if (value && !/^#[0-9a-fA-F]{6}$/.test(value)) {
    errors.push(`${path} must be a #RRGGBB hex color`);
  }
  return value;
}

function positiveNumber(
  input: unknown,
  path: string,
  errors: string[],
): number | null {
  if (!isFiniteNumber(input) || input <= 0) {
    errors.push(`${path} must be greater than 0`);
    return null;
  }
  return input;
}

function nonNegativeNumber(
  input: unknown,
  path: string,
  errors: string[],
): number | null {
  if (!isFiniteNumber(input) || input < 0) {
    errors.push(`${path} must be greater than or equal to 0`);
    return null;
  }
  return input;
}

function optionalNumber(
  input: unknown,
  path: string,
  errors: string[],
): number | undefined | null {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (!isFiniteNumber(input)) {
    errors.push(`${path} must be a number`);
    return null;
  }
  return input;
}

function optionalNonNegativeInteger(
  input: unknown,
  path: string,
  errors: string[],
): number | undefined | null {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (!Number.isInteger(input) || (input as number) < 0) {
    errors.push(`${path} must be a non-negative integer`);
    return null;
  }
  return input as number;
}

function optionalLoop(
  input: unknown,
  path: string,
  errors: string[],
): boolean | null {
  if (input === undefined) {
    return false;
  }
  if (typeof input !== "boolean") {
    errors.push(`${path} must be a boolean`);
    return null;
  }
  return input;
}

function optionalSpawnOffset(
  input: unknown,
  path: string,
  errors: string[],
): RuntimeVfxSpawnOffset | undefined | null {
  if (input === undefined || input === null) {
    return undefined;
  }
  const offset = objectValue(input, path, errors);
  if (!offset) {
    return null;
  }

  const result: RuntimeVfxSpawnOffset = {};
  for (const axis of ["x", "y", "z"] as const) {
    if (offset[axis] !== undefined) {
      if (!isFiniteNumber(offset[axis])) {
        errors.push(`${path}.${axis} must be a number`);
        return null;
      }
      result[axis] = offset[axis];
    }
  }
  return result;
}

function enumValue<T extends string>(
  input: unknown,
  allowed: readonly T[],
  path: string,
  errors: string[],
): T | null {
  if (typeof input !== "string" || !allowed.includes(input as T)) {
    errors.push(`${path} must be one of ${allowed.join(", ")}`);
    return null;
  }
  return input as T;
}

function optionalEnumValue<T extends string>(
  input: unknown,
  allowed: readonly T[],
  path: string,
  errors: string[],
): T | undefined | null {
  if (input === undefined || input === null) {
    return undefined;
  }
  return enumValue(input, allowed, path, errors);
}

function isFiniteNumber(input: unknown): input is number {
  return typeof input === "number" && Number.isFinite(input);
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as T;
}

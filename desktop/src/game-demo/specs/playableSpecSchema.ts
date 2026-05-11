import type {
  HeroPlayableSpec,
  HeroSpec,
  ResourceType,
  RuntimeSpec,
  SkillSlot,
  SkillSpec,
  SkillType,
  VfxShape,
  VfxSpec,
  VfxTheme,
} from "./playableSpecTypes";

export type ValidationResult<T> =
  | { success: true; data: T; errors: [] }
  | { success: false; data?: undefined; errors: string[] };

const SKILL_SLOTS = ["Q", "W", "E", "R"] as const;
const SKILL_TYPES = ["projectile", "aoe", "aoe_dot", "dash", "buff"] as const;
const VFX_THEMES = [
  "fire",
  "ice",
  "thunder",
  "poison",
  "dark",
  "holy",
  "arcane",
  "wind",
  "earth",
] as const;
const VFX_SHAPES = [
  "fireball",
  "beam",
  "circle_zone",
  "meteor",
  "slash",
  "trail",
  "shield",
  "burst",
  "wave",
  "rune",
] as const;
const RESOURCE_TYPES = ["mana", "energy", "rage", "none"] as const;

export const playableSpecSchema = {
  skill_slots: SKILL_SLOTS,
  skill_types: SKILL_TYPES,
  vfx_themes: VFX_THEMES,
  vfx_shapes: VFX_SHAPES,
  resource_types: RESOURCE_TYPES,
};

export function validatePlayableSpec(
  input: unknown,
): ValidationResult<HeroPlayableSpec> {
  const errors: string[] = [];
  const root = objectValue(input, "spec", errors);
  if (!root) {
    return { success: false, errors };
  }

  if (root.version !== "1.0") {
    errors.push("version must be 1.0");
  }

  const hero = validateHero(root.hero, errors);
  const gameplay_tags = validateGameplayTags(root.gameplay_tags, errors);
  const skills = validateSkills(root.skills, errors);
  const runtime = validateRuntime(root.runtime, errors);

  if (errors.length > 0 || !hero || !skills || !runtime) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      version: "1.0",
      hero,
      gameplay_tags,
      skills,
      runtime,
    },
    errors: [],
  };
}

export function assertPlayableSpec(input: unknown): HeroPlayableSpec {
  const result = validatePlayableSpec(input);
  if (!result.success) {
    throw new Error(`Invalid HeroPlayableSpec: ${result.errors.join("; ")}`);
  }
  return result.data;
}

export function isPlayableSpec(input: unknown): input is HeroPlayableSpec {
  return validatePlayableSpec(input).success;
}

function validateHero(input: unknown, errors: string[]): HeroSpec | null {
  const hero = objectValue(input, "hero", errors);
  if (!hero) {
    return null;
  }

  const id = requiredText(hero.id, "hero.id", errors);
  const name = requiredText(hero.name, "hero.name", errors);
  const title = requiredText(hero.title, "hero.title", errors);
  const role = requiredText(hero.role, "hero.role", errors);
  const max_hp = positiveNumber(hero.max_hp, "hero.max_hp", errors);
  const move_speed = positiveNumber(hero.move_speed, "hero.move_speed", errors);
  const attack_damage = nonNegativeNumber(
    hero.attack_damage,
    "hero.attack_damage",
    errors,
  );
  const attack_range = nonNegativeNumber(
    hero.attack_range,
    "hero.attack_range",
    errors,
  );
  const resource_type = enumValue<ResourceType>(
    hero.resource_type,
    RESOURCE_TYPES,
    "hero.resource_type",
    errors,
  );
  const max_resource = nonNegativeNumber(
    hero.max_resource,
    "hero.max_resource",
    errors,
  );

  if (
    !id ||
    !name ||
    !title ||
    !role ||
    max_hp === null ||
    move_speed === null ||
    attack_damage === null ||
    attack_range === null ||
    !resource_type ||
    max_resource === null
  ) {
    return null;
  }

  return {
    id,
    name,
    title,
    role,
    max_hp,
    move_speed,
    attack_damage,
    attack_range,
    resource_type,
    max_resource,
  };
}

function validateSkills(input: unknown, errors: string[]): SkillSpec[] | null {
  if (!Array.isArray(input)) {
    errors.push("skills must be an array");
    return null;
  }

  const skills = input
    .map((skill, index) => validateSkill(skill, `skills[${index}]`, errors))
    .filter((skill): skill is SkillSpec => Boolean(skill));

  if (input.length !== 4) {
    errors.push("skills must contain exactly Q/W/E/R");
  }

  const slots = skills.map((skill) => skill.slot);
  if (new Set(slots).size !== slots.length) {
    errors.push("skills must not contain duplicate slots");
  }

  for (const slot of SKILL_SLOTS) {
    if (!slots.includes(slot)) {
      errors.push(`skills must contain ${slot}`);
    }
  }

  return errors.length > 0 ? null : skills;
}

function validateSkill(
  input: unknown,
  path: string,
  errors: string[],
): SkillSpec | null {
  const skill = objectValue(input, path, errors);
  if (!skill) {
    return null;
  }

  const slot = enumValue<SkillSlot>(skill.slot, SKILL_SLOTS, `${path}.slot`, errors);
  const name = requiredText(skill.name, `${path}.name`, errors);
  const type = enumValue<SkillType>(skill.type, SKILL_TYPES, `${path}.type`, errors);
  const cooldown = nonNegativeNumber(skill.cooldown, `${path}.cooldown`, errors);
  const resource_cost =
    skill.resource_cost === undefined
      ? 0
      : nonNegativeNumber(skill.resource_cost, `${path}.resource_cost`, errors);
  const damage = optionalNumber(skill.damage, `${path}.damage`, errors, "nonnegative");
  const range = optionalNumber(skill.range, `${path}.range`, errors, "nonnegative");
  const radius = optionalNumber(skill.radius, `${path}.radius`, errors, "nonnegative");
  const speed = optionalNumber(skill.speed, `${path}.speed`, errors, "nonnegative");
  const duration = optionalNumber(
    skill.duration,
    `${path}.duration`,
    errors,
    "nonnegative",
  );
  const tick_interval = optionalNumber(
    skill.tick_interval,
    `${path}.tick_interval`,
    errors,
    "positive",
  );
  const distance = optionalNumber(
    skill.distance,
    `${path}.distance`,
    errors,
    "nonnegative",
  );
  const description = requiredText(skill.description, `${path}.description`, errors);
  const vfx = validateVfx(skill.vfx, `${path}.vfx`, errors);

  if (type) {
    requireSkillTypeFields(
      type,
      { damage, range, radius, speed, duration, tick_interval, distance },
      path,
      errors,
    );
  }

  if (
    !slot ||
    !name ||
    !type ||
    cooldown === null ||
    resource_cost === null ||
    damage === null ||
    range === null ||
    radius === null ||
    speed === null ||
    duration === null ||
    tick_interval === null ||
    distance === null ||
    !description ||
    !vfx
  ) {
    return null;
  }

  return omitUndefined({
    slot,
    name,
    type,
    cooldown,
    resource_cost,
    damage,
    range,
    radius,
    speed,
    duration,
    tick_interval,
    distance,
    description,
    vfx,
  });
}

function validateVfx(
  input: unknown,
  path: string,
  errors: string[],
): VfxSpec | null {
  const vfx = objectValue(input, path, errors);
  if (!vfx) {
    return null;
  }

  const theme = enumValue<VfxTheme>(vfx.theme, VFX_THEMES, `${path}.theme`, errors);
  const color = requiredText(vfx.color, `${path}.color`, errors);
  const shape = enumValue<VfxShape>(vfx.shape, VFX_SHAPES, `${path}.shape`, errors);
  const impact = requiredText(vfx.impact, `${path}.impact`, errors);
  const trail = requiredText(vfx.trail, `${path}.trail`, errors);

  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    errors.push(`${path}.color must be a #RRGGBB hex color`);
  }

  if (!theme || !color || !shape || !impact || !trail) {
    return null;
  }

  return { theme, color, shape, impact, trail };
}

function validateRuntime(input: unknown, errors: string[]): RuntimeSpec | null {
  const runtime = objectValue(input, "runtime", errors);
  if (!runtime) {
    return null;
  }

  if (runtime.control_scheme !== "wasd_mouse") {
    errors.push("runtime.control_scheme must be wasd_mouse");
  }
  if (runtime.camera !== "third_person_follow") {
    errors.push("runtime.camera must be third_person_follow");
  }
  if (runtime.map_profile !== "default_training_arena") {
    errors.push("runtime.map_profile must be default_training_arena");
  }

  if (
    runtime.control_scheme !== "wasd_mouse" ||
    runtime.camera !== "third_person_follow" ||
    runtime.map_profile !== "default_training_arena"
  ) {
    return null;
  }

  return {
    control_scheme: "wasd_mouse",
    camera: "third_person_follow",
    map_profile: "default_training_arena",
  };
}

function validateGameplayTags(input: unknown, errors: string[]): string[] {
  if (input === undefined) {
    return [];
  }
  if (!Array.isArray(input)) {
    errors.push("gameplay_tags must be an array");
    return [];
  }

  return input.map((tag, index) => {
    const value = requiredText(tag, `gameplay_tags[${index}]`, errors);
    return value ?? "";
  });
}

function requireSkillTypeFields(
  type: SkillType,
  values: Record<string, number | undefined | null>,
  path: string,
  errors: string[],
) {
  const requiredByType: Record<SkillType, string[]> = {
    projectile: ["damage", "range", "radius", "speed"],
    aoe: ["damage", "radius"],
    aoe_dot: ["damage", "radius", "duration", "tick_interval"],
    dash: ["distance"],
    buff: ["duration"],
  };

  for (const field of requiredByType[type]) {
    if (values[field] === undefined) {
      errors.push(`${path}.${field} is required for ${type}`);
    }
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
  mode: "nonnegative" | "positive",
): number | undefined | null {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (!isFiniteNumber(input)) {
    errors.push(`${path} must be a number`);
    return null;
  }
  if (mode === "positive" && input <= 0) {
    errors.push(`${path} must be greater than 0`);
    return null;
  }
  if (mode === "nonnegative" && input < 0) {
    errors.push(`${path} must be greater than or equal to 0`);
    return null;
  }
  return input;
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

function isFiniteNumber(input: unknown): input is number {
  return typeof input === "number" && Number.isFinite(input);
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as T;
}

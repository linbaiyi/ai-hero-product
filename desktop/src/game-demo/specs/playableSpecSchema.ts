import type {
  HeroPlayableSpec,
  HeroSpec,
  ResourceType,
  RuntimeSpec,
  SkillSlot,
  SkillEffectAction,
  SkillEffectSpec,
  SkillEffectTarget,
  SkillEffectTrigger,
  SkillSpec,
  SkillStatusEffectSpec,
  SkillType,
  StatusEffectType,
  VfxShape,
  VfxSpec,
  VfxTheme,
  War3AbilityContract,
  War3AbilityLevelSpec,
  War3AreaSpec,
  War3ArtBindingSpec,
  War3ArtHook,
  War3BuffSpec,
  War3CastType,
  War3EffectKind,
  War3MissileSpec,
  War3SummonSpec,
  War3TargetFilters,
  War3TargetType,
} from "./playableSpecTypes";

export type ValidationResult<T> =
  | { success: true; data: T; errors: [] }
  | { success: false; data?: undefined; errors: string[] };

const SKILL_SLOTS = ["Q", "W", "E", "R"] as const;
const SKILL_TYPES = [
  "projectile",
  "aoe",
  "aoe_dot",
  "dash",
  "buff",
  "summon",
] as const;
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
const STATUS_EFFECT_TYPES = ["burn", "poison", "slow", "mark", "stun"] as const;
const SKILL_EFFECT_TRIGGERS = [
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
const SKILL_EFFECT_ACTIONS = [
  "damage",
  "aoe_damage",
  "apply_status",
  "spawn_zone",
  "summon",
  "spawn_projectile",
  "spawn_vfx_event",
] as const;
const SKILL_EFFECT_TARGETS = [
  "self",
  "target_position",
  "target_enemy",
  "enemies_in_radius",
  "projectile_position",
  "summon_position",
  "zone_center",
] as const;
const WAR3_CAST_TYPES = [
  "instant",
  "unit_target",
  "point_target",
  "area_target",
  "self",
  "passive",
  "toggle",
  "channel",
] as const;
const WAR3_TARGET_TYPES = [
  "none",
  "self",
  "enemy_unit",
  "ally_unit",
  "point",
  "area",
  "summoned_unit",
] as const;
const WAR3_EFFECT_KINDS = [
  "damage",
  "heal",
  "buff",
  "debuff",
  "summon",
  "missile",
  "area_persistent",
  "movement",
  "vfx_only",
] as const;
const WAR3_ART_HOOKS = [
  "cast",
  "missile",
  "impact",
  "area",
  "buff",
  "summon",
  "death",
  "loop",
] as const;

export const playableSpecSchema = {
  skill_slots: SKILL_SLOTS,
  skill_types: SKILL_TYPES,
  vfx_themes: VFX_THEMES,
  vfx_shapes: VFX_SHAPES,
  resource_types: RESOURCE_TYPES,
  status_effect_types: STATUS_EFFECT_TYPES,
  skill_effect_triggers: SKILL_EFFECT_TRIGGERS,
  skill_effect_actions: SKILL_EFFECT_ACTIONS,
  skill_effect_targets: SKILL_EFFECT_TARGETS,
  war3_cast_types: WAR3_CAST_TYPES,
  war3_target_types: WAR3_TARGET_TYPES,
  war3_effect_kinds: WAR3_EFFECT_KINDS,
  war3_art_hooks: WAR3_ART_HOOKS,
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
  const status_effects = validateStatusEffects(
    skill.status_effects,
    `${path}.status_effects`,
    errors,
  );
  const effects = validateSkillEffects(skill.effects, `${path}.effects`, errors);
  const ability_contract = validateWar3AbilityContract(
    skill.ability_contract,
    `${path}.ability_contract`,
    errors,
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
    status_effects === null ||
    effects === null ||
    ability_contract === null ||
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
    status_effects,
    effects,
    ability_contract,
    description,
    vfx,
  });
}

function validateWar3AbilityContract(
  input: unknown,
  path: string,
  errors: string[],
): War3AbilityContract | undefined | null {
  if (input === undefined || input === null) {
    return undefined;
  }
  const contract = objectValue(input, path, errors);
  if (!contract) {
    return null;
  }

  const ability_id = requiredText(contract.ability_id, `${path}.ability_id`, errors);
  const base_order = requiredText(contract.base_order, `${path}.base_order`, errors);
  const cast_type = enumValue<War3CastType>(
    contract.cast_type,
    WAR3_CAST_TYPES,
    `${path}.cast_type`,
    errors,
  );
  const primary_target = enumValue<War3TargetType>(
    contract.primary_target,
    WAR3_TARGET_TYPES,
    `${path}.primary_target`,
    errors,
  );
  const target_filters = validateWar3TargetFilters(
    contract.target_filters,
    `${path}.target_filters`,
    errors,
  );
  const effect_kinds = enumArray<War3EffectKind>(
    contract.effect_kinds,
    WAR3_EFFECT_KINDS,
    `${path}.effect_kinds`,
    errors,
  );
  const levels = validateWar3AbilityLevels(contract.levels, `${path}.levels`, errors);
  const missile = validateWar3Missile(contract.missile, `${path}.missile`, errors);
  const area = validateWar3Area(contract.area, `${path}.area`, errors);
  const buff = validateWar3Buff(contract.buff, `${path}.buff`, errors);
  const summon = validateWar3Summon(contract.summon, `${path}.summon`, errors);
  const art_bindings = validateWar3ArtBindings(
    contract.art_bindings,
    `${path}.art_bindings`,
    errors,
  );
  const unsupported_notes = optionalTextArray(
    contract.unsupported_notes,
    `${path}.unsupported_notes`,
    errors,
  );

  if (
    !ability_id ||
    !base_order ||
    !cast_type ||
    !primary_target ||
    !target_filters ||
    !effect_kinds ||
    !levels ||
    !missile ||
    !area ||
    !buff ||
    !summon ||
    !art_bindings ||
    !unsupported_notes
  ) {
    return null;
  }

  return {
    ability_id,
    base_order,
    cast_type,
    primary_target,
    target_filters,
    effect_kinds,
    levels,
    missile,
    area,
    buff,
    summon,
    art_bindings,
    unsupported_notes,
  };
}

function validateWar3TargetFilters(
  input: unknown,
  path: string,
  errors: string[],
): War3TargetFilters | null {
  const filters = objectValue(input, path, errors);
  if (!filters) {
    return null;
  }
  const allowed = enumArray<War3TargetType>(
    filters.allowed,
    WAR3_TARGET_TYPES,
    `${path}.allowed`,
    errors,
  );
  const enemy = booleanValue(filters.enemy, `${path}.enemy`, errors);
  const ally = booleanValue(filters.ally, `${path}.ally`, errors);
  const self = booleanValue(filters.self, `${path}.self`, errors);
  const ground = booleanValue(filters.ground, `${path}.ground`, errors);
  const summoned = booleanValue(filters.summoned, `${path}.summoned`, errors);

  if (!allowed || enemy === null || ally === null || self === null || ground === null || summoned === null) {
    return null;
  }
  return { allowed, enemy, ally, self, ground, summoned };
}

function validateWar3AbilityLevels(
  input: unknown,
  path: string,
  errors: string[],
): War3AbilityLevelSpec[] | null {
  if (!Array.isArray(input)) {
    errors.push(`${path} must be an array`);
    return null;
  }
  const result: War3AbilityLevelSpec[] = [];
  for (const [index, rawLevel] of input.entries()) {
    const level = objectValue(rawLevel, `${path}[${index}]`, errors);
    if (!level) {
      continue;
    }
    const levelNumber = positiveNumber(level.level, `${path}[${index}].level`, errors);
    const cooldown = nonNegativeNumber(level.cooldown, `${path}[${index}].cooldown`, errors);
    const resource_cost =
      level.resource_cost === undefined
        ? 0
        : nonNegativeNumber(level.resource_cost, `${path}[${index}].resource_cost`, errors);
    const damage = optionalNumber(level.damage, `${path}[${index}].damage`, errors, "nonnegative");
    const area = optionalNumber(level.area, `${path}[${index}].area`, errors, "nonnegative");
    const duration = optionalNumber(level.duration, `${path}[${index}].duration`, errors, "nonnegative");
    const notes =
      level.notes === undefined
        ? undefined
        : optionalText(level.notes, `${path}[${index}].notes`, errors);

    if (
      levelNumber === null ||
      cooldown === null ||
      resource_cost === null ||
      damage === null ||
      area === null ||
      duration === null ||
      notes === null
    ) {
      continue;
    }
    result.push(omitUndefined({ level: levelNumber, cooldown, resource_cost, damage, area, duration, notes }));
  }
  return errors.length > 0 ? null : result;
}

function validateWar3Missile(
  input: unknown,
  path: string,
  errors: string[],
): War3MissileSpec | null {
  const missile = objectValue(input, path, errors);
  if (!missile) {
    return null;
  }
  const enabled = booleanValue(missile.enabled, `${path}.enabled`, errors);
  const speed = optionalNumber(missile.speed, `${path}.speed`, errors, "nonnegative");
  const arc = optionalNumber(missile.arc, `${path}.arc`, errors, "nonnegative");
  const homing = booleanValue(missile.homing, `${path}.homing`, errors);
  if (enabled === null || speed === null || arc === null || homing === null) {
    return null;
  }
  return omitUndefined({ enabled, speed, arc, homing });
}

function validateWar3Area(
  input: unknown,
  path: string,
  errors: string[],
): War3AreaSpec | null {
  const areaSpec = objectValue(input, path, errors);
  if (!areaSpec) {
    return null;
  }
  const enabled = booleanValue(areaSpec.enabled, `${path}.enabled`, errors);
  const radius = optionalNumber(areaSpec.radius, `${path}.radius`, errors, "nonnegative");
  const duration = optionalNumber(areaSpec.duration, `${path}.duration`, errors, "nonnegative");
  const tick_interval = optionalNumber(areaSpec.tick_interval, `${path}.tick_interval`, errors, "positive");
  if (enabled === null || radius === null || duration === null || tick_interval === null) {
    return null;
  }
  return omitUndefined({ enabled, radius, duration, tick_interval });
}

function validateWar3Buff(
  input: unknown,
  path: string,
  errors: string[],
): War3BuffSpec | null {
  const buff = objectValue(input, path, errors);
  if (!buff) {
    return null;
  }
  const enabled = booleanValue(buff.enabled, `${path}.enabled`, errors);
  const buff_type =
    buff.buff_type === undefined || buff.buff_type === null
      ? undefined
      : enumValue<StatusEffectType>(buff.buff_type, STATUS_EFFECT_TYPES, `${path}.buff_type`, errors);
  const duration = optionalNumber(buff.duration, `${path}.duration`, errors, "nonnegative");
  const tick_interval = optionalNumber(buff.tick_interval, `${path}.tick_interval`, errors, "positive");
  const value = optionalNumber(buff.value, `${path}.value`, errors, "nonnegative");
  if (enabled === null || buff_type === null || duration === null || tick_interval === null || value === null) {
    return null;
  }
  return omitUndefined({ enabled, buff_type, duration, tick_interval, value });
}

function validateWar3Summon(
  input: unknown,
  path: string,
  errors: string[],
): War3SummonSpec | null {
  const summon = objectValue(input, path, errors);
  if (!summon) {
    return null;
  }
  const enabled = booleanValue(summon.enabled, `${path}.enabled`, errors);
  const unit_name =
    summon.unit_name === undefined || summon.unit_name === null
      ? undefined
      : requiredText(summon.unit_name, `${path}.unit_name`, errors);
  const duration = optionalNumber(summon.duration, `${path}.duration`, errors, "nonnegative");
  const attack_damage = optionalNumber(summon.attack_damage, `${path}.attack_damage`, errors, "nonnegative");
  const attack_range = optionalNumber(summon.attack_range, `${path}.attack_range`, errors, "nonnegative");
  if (enabled === null || unit_name === null || duration === null || attack_damage === null || attack_range === null) {
    return null;
  }
  return omitUndefined({ enabled, unit_name, duration, attack_damage, attack_range });
}

function validateWar3ArtBindings(
  input: unknown,
  path: string,
  errors: string[],
): War3ArtBindingSpec[] | null {
  if (!Array.isArray(input)) {
    errors.push(`${path} must be an array`);
    return null;
  }
  const result: War3ArtBindingSpec[] = [];
  for (const [index, rawBinding] of input.entries()) {
    const binding = objectValue(rawBinding, `${path}[${index}]`, errors);
    if (!binding) {
      continue;
    }
    const hook = enumValue<War3ArtHook>(binding.hook, WAR3_ART_HOOKS, `${path}[${index}].hook`, errors);
    const event =
      binding.event === undefined || binding.event === null
        ? undefined
        : enumValue<SkillEffectTrigger>(binding.event, SKILL_EFFECT_TRIGGERS, `${path}[${index}].event`, errors);
    const usage = requiredText(binding.usage, `${path}[${index}].usage`, errors);
    const attachment =
      binding.attachment === undefined || binding.attachment === null
        ? undefined
        : requiredText(binding.attachment, `${path}[${index}].attachment`, errors);
    if (!hook || event === null || !usage || attachment === null) {
      continue;
    }
    result.push(omitUndefined({ hook, event, usage, attachment }));
  }
  return errors.length > 0 ? null : result;
}

function validateSkillEffects(
  input: unknown,
  path: string,
  errors: string[],
): SkillEffectSpec[] | undefined | null {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (!Array.isArray(input)) {
    errors.push(`${path} must be an array`);
    return null;
  }

  const result: SkillEffectSpec[] = [];
  for (const [index, rawEffect] of input.entries()) {
    const effect = objectValue(rawEffect, `${path}[${index}]`, errors);
    if (!effect) {
      continue;
    }
    const trigger = enumValue<SkillEffectTrigger>(
      effect.trigger,
      SKILL_EFFECT_TRIGGERS,
      `${path}[${index}].trigger`,
      errors,
    );
    const action = enumValue<SkillEffectAction>(
      effect.action,
      SKILL_EFFECT_ACTIONS,
      `${path}[${index}].action`,
      errors,
    );
    const target = enumValue<SkillEffectTarget>(
      effect.target,
      SKILL_EFFECT_TARGETS,
      `${path}[${index}].target`,
      errors,
    );
    const damage = optionalNumber(
      effect.damage,
      `${path}[${index}].damage`,
      errors,
      "nonnegative",
    );
    const radius = optionalNumber(
      effect.radius,
      `${path}[${index}].radius`,
      errors,
      "nonnegative",
    );
    const duration = optionalNumber(
      effect.duration,
      `${path}[${index}].duration`,
      errors,
      "nonnegative",
    );
    const tick_interval = optionalNumber(
      effect.tick_interval,
      `${path}[${index}].tick_interval`,
      errors,
      "positive",
    );
    const status_effects = validateStatusEffects(
      effect.status_effects,
      `${path}[${index}].status_effects`,
      errors,
    );

    if (
      !trigger ||
      !action ||
      !target ||
      damage === null ||
      radius === null ||
      duration === null ||
      tick_interval === null ||
      status_effects === null
    ) {
      continue;
    }

    if (["aoe_damage", "apply_status", "spawn_zone"].includes(action) && radius === undefined) {
      errors.push(`${path}[${index}].radius is required for ${action}`);
    }
    if (["damage", "aoe_damage", "spawn_zone"].includes(action) && damage === undefined) {
      errors.push(`${path}[${index}].damage is required for ${action}`);
    }
    if (action === "spawn_zone" && (duration === undefined || tick_interval === undefined)) {
      errors.push(`${path}[${index}].duration and tick_interval are required for spawn_zone`);
    }
    if (action === "apply_status" && (!status_effects || status_effects.length === 0)) {
      errors.push(`${path}[${index}].status_effects is required for apply_status`);
    }

    result.push(
      omitUndefined({
        trigger,
        action,
        target,
        damage,
        radius,
        duration,
        tick_interval,
        status_effects,
      }),
    );
  }

  return errors.length > 0 ? null : result;
}

function validateStatusEffects(
  input: unknown,
  path: string,
  errors: string[],
): SkillStatusEffectSpec[] | undefined | null {
  if (input === undefined || input === null) {
    return undefined;
  }
  if (!Array.isArray(input)) {
    errors.push(`${path} must be an array`);
    return null;
  }

  const result: SkillStatusEffectSpec[] = [];
  for (const [index, rawEffect] of input.entries()) {
    const effect = objectValue(rawEffect, `${path}[${index}]`, errors);
    if (!effect) {
      continue;
    }

    const type = enumValue<StatusEffectType>(
      effect.type,
      STATUS_EFFECT_TYPES,
      `${path}[${index}].type`,
      errors,
    );
    const duration = positiveNumber(effect.duration, `${path}[${index}].duration`, errors);
    const tick_interval = optionalNumber(
      effect.tick_interval,
      `${path}[${index}].tick_interval`,
      errors,
      "positive",
    );
    const damage = optionalNumber(
      effect.damage,
      `${path}[${index}].damage`,
      errors,
      "nonnegative",
    );
    const value = optionalNumber(
      effect.value,
      `${path}[${index}].value`,
      errors,
      "nonnegative",
    );

    if (
      !type ||
      duration === null ||
      tick_interval === null ||
      damage === null ||
      value === null
    ) {
      continue;
    }

    result.push(omitUndefined({ type, duration, tick_interval, damage, value }));
  }

  return errors.length > 0 ? null : result;
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
    summon: ["duration"],
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

function optionalText(input: unknown, path: string, errors: string[]): string | null {
  if (typeof input !== "string") {
    errors.push(`${path} must be a string`);
    return null;
  }
  return input.trim();
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

function booleanValue(input: unknown, path: string, errors: string[]): boolean | null {
  if (typeof input !== "boolean") {
    errors.push(`${path} must be a boolean`);
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

function enumArray<T extends string>(
  input: unknown,
  allowed: readonly T[],
  path: string,
  errors: string[],
): T[] | null {
  if (!Array.isArray(input)) {
    errors.push(`${path} must be an array`);
    return null;
  }
  const values: T[] = [];
  for (const [index, item] of input.entries()) {
    const value = enumValue<T>(item, allowed, `${path}[${index}]`, errors);
    if (value) {
      values.push(value);
    }
  }
  return errors.length > 0 ? null : values;
}

function optionalTextArray(
  input: unknown,
  path: string,
  errors: string[],
): string[] | null {
  if (input === undefined || input === null) {
    return [];
  }
  if (!Array.isArray(input)) {
    errors.push(`${path} must be an array`);
    return null;
  }
  const values: string[] = [];
  for (const [index, item] of input.entries()) {
    const value = requiredText(item, `${path}[${index}]`, errors);
    if (value) {
      values.push(value);
    }
  }
  return errors.length > 0 ? null : values;
}

function isFiniteNumber(input: unknown): input is number {
  return typeof input === "number" && Number.isFinite(input);
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as T;
}

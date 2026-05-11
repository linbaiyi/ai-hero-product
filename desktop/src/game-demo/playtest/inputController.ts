import type { SkillSlot } from "../specs/playableSpecTypes";
import type { Vec2 } from "../core";

export type InputState = {
  move: Vec2;
  pressedSkills: Set<SkillSlot>;
  pointerTarget?: Vec2;
};

export type InputController = {
  state: InputState;
  destroy: () => void;
  clearPressedSkills: () => void;
};

type InputTarget = HTMLElement | Window;

export function createSkillSlotFromNumberKey(key: string): SkillSlot | null {
  switch (key) {
    case "1":
      return "Q";
    case "2":
      return "W";
    case "3":
      return "E";
    case "4":
      return "R";
    default:
      return null;
  }
}

export function createInputController(target: InputTarget): InputController {
  const pressedMovementKeys = new Set<string>();
  const state: InputState = {
    move: { x: 0, z: 0 },
    pressedSkills: new Set<SkillSlot>(),
  };

  const updateMove = () => {
    state.move = {
      x: axisValue(pressedMovementKeys, ["d", "arrowright"], ["a", "arrowleft"]),
      z: axisValue(pressedMovementKeys, ["w", "arrowup"], ["s", "arrowdown"]),
    };
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const movementKey = normalizeKey(event.key);
    if (isMovementKey(movementKey)) {
      pressedMovementKeys.add(movementKey);
      updateMove();
    }

    const skillSlot = createSkillSlotFromNumberKey(event.key);
    if (skillSlot) {
      state.pressedSkills.add(skillSlot);
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const movementKey = normalizeKey(event.key);
    if (isMovementKey(movementKey)) {
      pressedMovementKeys.delete(movementKey);
      updateMove();
    }
  };

  target.addEventListener("keydown", handleKeyDown as EventListener);
  target.addEventListener("keyup", handleKeyUp as EventListener);

  return {
    state,
    clearPressedSkills: () => state.pressedSkills.clear(),
    destroy: () => {
      target.removeEventListener("keydown", handleKeyDown as EventListener);
      target.removeEventListener("keyup", handleKeyUp as EventListener);
      pressedMovementKeys.clear();
      state.pressedSkills.clear();
      state.move = { x: 0, z: 0 };
    },
  };
}

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

function isMovementKey(key: string): boolean {
  return (
    key === "w" ||
    key === "a" ||
    key === "s" ||
    key === "d" ||
    key === "arrowup" ||
    key === "arrowdown" ||
    key === "arrowleft" ||
    key === "arrowright"
  );
}

function axisValue(
  keys: Set<string>,
  positiveKeys: string[],
  negativeKeys: string[],
): number {
  const positive = positiveKeys.some((key) => keys.has(key)) ? 1 : 0;
  const negative = negativeKeys.some((key) => keys.has(key)) ? 1 : 0;
  return positive - negative;
}

import type { SkillSlot } from "../specs/playableSpecTypes";
import type { Vec2 } from "../core";

export type InputState = {
  move: Vec2;
  pressedSkills: Set<SkillSlot>;
  pointerTarget?: Vec2;
  moveDestination?: Vec2;
};

export type InputController = {
  state: InputState;
  destroy: () => void;
  clearPressedSkills: () => void;
  clearMoveDestination: () => void;
  clearPointerTarget: () => void;
};

type InputTarget = HTMLElement | Window;

export type InputControllerOptions = {
  keyboardTarget?: InputTarget;
  resolvePointerTarget?: (event: MouseEvent) => Vec2 | null;
};

export function createSkillSlotFromKey(key: string): SkillSlot | null {
  switch (key.toLowerCase()) {
    case "q":
      return "Q";
    case "w":
      return "W";
    case "e":
      return "E";
    case "r":
      return "R";
    default:
      return null;
  }
}

export const createSkillSlotFromNumberKey = createSkillSlotFromKey;

export function createInputController(
  target: InputTarget,
  options: InputControllerOptions = {},
): InputController {
  const keyboardTarget = options.keyboardTarget ?? target;
  const state: InputState = {
    move: { x: 0, z: 0 },
    pressedSkills: new Set<SkillSlot>(),
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const skillSlot = createSkillSlotFromKey(event.key);
    if (skillSlot) {
      event.preventDefault();
      state.pressedSkills.add(skillSlot);
    }
  };

  const updatePointerTarget = (event: MouseEvent): Vec2 | null => {
    const targetPoint = options.resolvePointerTarget?.(event);
    if (!targetPoint) {
      return null;
    }
    state.pointerTarget = targetPoint;
    return targetPoint;
  };

  const handlePointerMove = (event: MouseEvent) => {
    updatePointerTarget(event);
  };

  const handlePointerDown = (event: MouseEvent) => {
    const targetPoint = updatePointerTarget(event);
    if (!targetPoint) {
      return;
    }

    if (event.button === 2) {
      event.preventDefault();
      state.moveDestination = targetPoint;
    }
  };

  const handleContextMenu = (event: Event) => {
    event.preventDefault();
  };

  keyboardTarget.addEventListener("keydown", handleKeyDown as EventListener);
  target.addEventListener("mousemove", handlePointerMove as EventListener);
  target.addEventListener("mousedown", handlePointerDown as EventListener);
  target.addEventListener("contextmenu", handleContextMenu as EventListener);

  return {
    state,
    clearPressedSkills: () => state.pressedSkills.clear(),
    clearMoveDestination: () => {
      state.moveDestination = undefined;
      state.move = { x: 0, z: 0 };
    },
    clearPointerTarget: () => {
      state.pointerTarget = undefined;
    },
    destroy: () => {
      keyboardTarget.removeEventListener("keydown", handleKeyDown as EventListener);
      target.removeEventListener("mousemove", handlePointerMove as EventListener);
      target.removeEventListener("mousedown", handlePointerDown as EventListener);
      target.removeEventListener("contextmenu", handleContextMenu as EventListener);
      state.pressedSkills.clear();
      state.move = { x: 0, z: 0 };
      state.pointerTarget = undefined;
      state.moveDestination = undefined;
    },
  };
}

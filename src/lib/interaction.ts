"use client";

// Proximity interaction: world objects register themselves; a resolver inside the Canvas picks the
// nearest one in range of the player each tick and publishes it here for the HUD. Pressing E /
// the action button runs that object's action (which calls the backend like before).
import { useEffect, useRef } from "react";
import { create } from "zustand";

export interface Prompt {
  icon: string;
  label: string;
  /** false = informational only (the action button is disabled). */
  actionable: boolean;
}

export interface Interactable {
  id: string;
  /** Current world position (x, z). Called every tick, so animals can move. */
  pos: () => [number, number];
  radius: number;
  prompt: () => Prompt;
  act: () => void;
}

const registry = new Map<string, Interactable>();

export function register(item: Interactable) {
  registry.set(item.id, item);
  return () => {
    if (registry.get(item.id) === item) registry.delete(item.id);
  };
}

/** Live player transform, written by the controller every frame (no React re-render). */
export const player = { x: 0, z: 0, heading: 0 };

interface InteractionState {
  focusId: string | null;
  prompt: Prompt | null;
  /** A modal / panel is open: movement keys and E are ignored. */
  uiOpen: boolean;
  setFocus: (id: string | null, prompt: Prompt | null) => void;
  setUiOpen: (open: boolean) => void;
}

export const useInteraction = create<InteractionState>((set) => ({
  focusId: null,
  prompt: null,
  uiOpen: false,
  setFocus: (focusId, prompt) => set({ focusId, prompt }),
  setUiOpen: (uiOpen) => set({ uiOpen }),
}));

/** Picks the nearest registered object within its radius of the player. */
export function resolveFocus() {
  let best: Interactable | null = null;
  let bestD = Infinity;
  for (const item of registry.values()) {
    const [x, z] = item.pos();
    const d = Math.hypot(x - player.x, z - player.z);
    if (d <= item.radius && d < bestD) {
      best = item;
      bestD = d;
    }
  }
  const state = useInteraction.getState();
  const prompt = best ? best.prompt() : null;
  const same =
    state.focusId === (best?.id ?? null) &&
    state.prompt?.label === prompt?.label &&
    state.prompt?.icon === prompt?.icon &&
    state.prompt?.actionable === prompt?.actionable;
  if (!same) state.setFocus(best?.id ?? null, prompt);
}

export function triggerFocus() {
  const { focusId, uiOpen } = useInteraction.getState();
  if (uiOpen || !focusId) return;
  const item = registry.get(focusId);
  if (item && item.prompt().actionable) item.act();
}

/** Registers a world object for proximity interaction, always using its latest callbacks. */
export function useInteractable(id: string, spec: Omit<Interactable, "id">, enabled = true) {
  const ref = useRef(spec);
  ref.current = spec;
  useEffect(() => {
    if (!enabled) return;
    return register({
      id,
      radius: ref.current.radius,
      pos: () => ref.current.pos(),
      prompt: () => ref.current.prompt(),
      act: () => ref.current.act(),
    });
  }, [id, enabled]);
}

// Dev-only debug handle (used by local browser tests to read the player position).
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __farmz?: unknown }).__farmz = { player, useInteraction };
}

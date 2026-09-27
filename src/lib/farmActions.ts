"use client";

// Farm actions shared by the 3D scene (and any future 2D fallback). Every call goes to the
// existing edge functions; responses patch the cached state and a refetch follows.
import { useCallback } from "react";
import { useAction, useConfig } from "./game";
import { emoji } from "./emoji";
import type { Animal, GameState, Plot } from "./types";

export type CropStage = 0 | 1 | 2;

/** Visual stage from server timestamps. Cosmetic only — the server decides what is harvestable. */
export function cropStage(plot: Plot, now: number): { stage: CropStage; pct: number; remaining: number } {
  const readyAt = plot.ready_at ? Date.parse(plot.ready_at) : 0;
  const plantedAt = plot.planted_at ? Date.parse(plot.planted_at) : 0;
  const remaining = readyAt - now;
  if (plot.state === "ready" || (plot.state === "growing" && remaining <= 0)) return { stage: 2, pct: 1, remaining: 0 };
  const pct = readyAt > plantedAt ? Math.min(1, Math.max(0, (now - plantedAt) / (readyAt - plantedAt))) : 0;
  return { stage: pct < 0.4 ? 0 : 1, pct, remaining };
}

export type AnimalStatus = "hungry" | "producing" | "ready";

export function animalStatus(a: Animal, now: number): { status: AnimalStatus; pct: number; remaining: number } {
  if (!a.produce_ready_at) return { status: "hungry", pct: 0, remaining: 0 };
  const readyAt = Date.parse(a.produce_ready_at);
  const fedAt = a.fed_at ? Date.parse(a.fed_at) : readyAt;
  const remaining = readyAt - now;
  if (remaining <= 0) return { status: "ready", pct: 1, remaining: 0 };
  const pct = readyAt > fedAt ? Math.min(1, (now - fedAt) / (readyAt - fedAt)) : 0;
  return { status: "producing", pct, remaining };
}

export function useFarmActions() {
  const { run, busy } = useAction();
  const { data: config } = useConfig();

  const plant = useCallback(
    (plot: Plot, cropId: string) =>
      run<Plot>(`plot:${plot.id}`, "plant", { plotId: plot.id, cropId }, {
        patch: (s, r) => ({ ...s, plots: s.plots.map((p) => (p.id === r.id ? r : p)) }),
        success: () => `Planted ${config?.crops[cropId]?.name ?? cropId} ${emoji(cropId)}`,
      }),
    [run, config],
  );

  const harvest = useCallback(
    (plot: Plot) =>
      run<{ item: string; qty: number }>(`plot:${plot.id}`, "harvest", { plotId: plot.id }, {
        patch: (s: GameState) => ({
          ...s,
          plots: s.plots.map((p) =>
            p.id === plot.id ? { ...p, state: "empty" as const, crop_id: null, planted_at: null, ready_at: null } : p,
          ),
        }),
      }),
    [run],
  );

  const feed = useCallback(
    (a: Animal) =>
      run<{ animal: Animal }>(`animal:${a.id}`, "feed-animal", { animalId: a.id }, {
        patch: (s, r) => ({ ...s, animals: s.animals.map((x) => (x.id === a.id ? r.animal : x)) }),
        success: () => `${emoji(a.type)} Yum!`,
      }),
    [run],
  );

  const collect = useCallback(
    (a: Animal) =>
      run<{ item: string; qty: number }>(`animal:${a.id}`, "collect-produce", { animalId: a.id }, {
        patch: (s) => ({ ...s, animals: s.animals.map((x) => (x.id === a.id ? { ...x, produce_ready_at: null } : x)) }),
      }),
    [run],
  );

  return { plant, harvest, feed, collect, busy };
}

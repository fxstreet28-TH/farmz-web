// Single place that maps game ids -> 3D models. Swap art here without touching scene code.
//
// A ModelSpec is either:
//   { url }        -> a .glb under /public (loaded lazily with useGLTF, cloned per use)
//   { procedural } -> a built-in low-poly placeholder (see src/components/three/Procedural.tsx)
//
// To replace a placeholder with real art: drop the .glb in public/models/... and change
// `{ procedural: "sheep" }` to `{ url: "/models/your/sheep.glb", scale: ..., y: ... }`.
// `scale` is uniform, `y` lifts the model (after scaling) so it sits on the ground, `rotY` is radians.

export type ProceduralKind = "sheep" | "barn" | "sprout" | "haybale" | "trough";

export type ModelSpec =
  | { url: string; scale?: number; y?: number; rotY?: number; offset?: [number, number, number] }
  | { procedural: ProceduralKind; scale?: number; y?: number; rotY?: number; offset?: [number, number, number] };

/** A stage can stack several models (e.g. a leafy base with fruit on top). */
export type StageSpec = ModelSpec[];

// Nature Kit models are ~0.4 units wide; a plot is ~1 unit, so they are scaled up.
const N = 2.2;

export const CROP_MODELS: Record<string, { stages: [StageSpec, StageSpec, StageSpec] }> = {
  // stages: 0 = just planted, 1 = growing, 2 = ready to harvest
  wheat: {
    stages: [
      [{ url: "/models/nature/crops_leafsStageA.glb", scale: N * 1.1 }],
      [{ url: "/models/nature/crops_wheatStageA.glb", scale: N }],
      [{ url: "/models/nature/crops_wheatStageB.glb", scale: N }],
    ],
  },
  corn: {
    stages: [
      [{ url: "/models/nature/crops_cornStageA.glb", scale: N * 1.1 }],
      [{ url: "/models/nature/crops_cornStageB.glb", scale: N * 0.9 }],
      [{ url: "/models/nature/crops_cornStageD.glb", scale: N * 0.9 }],
    ],
  },
  carrot: {
    stages: [
      [{ url: "/models/nature/crops_leafsStageA.glb", scale: N * 1.1 }],
      [{ url: "/models/nature/crops_leafsStageB.glb", scale: N * 0.8 }],
      [{ url: "/models/nature/crop_carrot.glb", scale: N }],
    ],
  },
  tomato: {
    stages: [
      [{ url: "/models/nature/crops_leafsStageA.glb", scale: N * 1.1 }],
      [{ url: "/models/nature/crops_leafsStageB.glb", scale: N }],
      [
        { url: "/models/nature/crops_leafsStageB.glb", scale: N },
        { url: "/models/food/tomato.glb", scale: 2.4, offset: [0.12, 0.55, 0.1] },
        { url: "/models/food/tomato.glb", scale: 2.0, offset: [-0.18, 0.8, -0.05] },
      ],
    ],
  },
  strawberry: {
    stages: [
      [{ url: "/models/nature/crops_leafsStageA.glb", scale: N * 1.1 }],
      [{ url: "/models/nature/plant_bushLarge.glb", scale: N * 1.2 }],
      [
        { url: "/models/nature/plant_bushLarge.glb", scale: N * 1.2 },
        { url: "/models/food/strawberry.glb", scale: 2.6, offset: [0.2, 0.35, 0.15] },
        { url: "/models/food/strawberry.glb", scale: 2.3, offset: [-0.2, 0.4, -0.1] },
      ],
    ],
  },
};

/** Used for crops the config map doesn't know yet (server can add crops without a frontend release). */
export const FALLBACK_CROP: { stages: [StageSpec, StageSpec, StageSpec] } = {
  stages: [[{ procedural: "sprout", scale: 0.6 }], [{ procedural: "sprout" }], [{ procedural: "sprout", scale: 1.4 }]],
};

// Cube Pets models are ~1.5 units and dip 0.3 below origin (legs).
export const ANIMAL_MODELS: Record<string, ModelSpec & { walkSpeed: number; radius: number }> = {
  chicken: { url: "/models/pets/animal-chick.glb", scale: 0.42, y: 0.13, walkSpeed: 0.9, radius: 0.35 },
  cow: { url: "/models/pets/animal-cow.glb", scale: 0.62, y: 0.19, walkSpeed: 0.55, radius: 0.55 },
  // PLACEHOLDER: no CC0 sheep in the downloaded kits — swap for e.g. Quaternius "Animated Animals" sheep.
  sheep: { procedural: "sheep", scale: 1, walkSpeed: 0.5, radius: 0.5 },
};

export const FALLBACK_ANIMAL: ModelSpec & { walkSpeed: number; radius: number } = {
  procedural: "sheep",
  walkSpeed: 0.5,
  radius: 0.5,
};

/** Scenery props. */
export const PROP_MODELS = {
  soil: { url: "/models/nature/crops_dirtSingle.glb", scale: 2.4 } as ModelSpec,
  fence: { url: "/models/nature/fence_simple.glb", scale: 1.2 } as ModelSpec,
  fenceGate: { url: "/models/nature/fence_gate.glb", scale: 1.2 } as ModelSpec,
  // PLACEHOLDER: no CC0 barn in the downloaded kits — swap for e.g. Quaternius "Ultimate Farming" barn.
  barn: { procedural: "barn" } as ModelSpec,
  trough: { procedural: "trough" } as ModelSpec,
  haybale: { procedural: "haybale" } as ModelSpec,
  trees: [
    { url: "/models/nature/tree_oak.glb", scale: 2.6 },
    { url: "/models/nature/tree_default.glb", scale: 2.4 },
    { url: "/models/nature/tree_pineRoundA.glb", scale: 2.6 },
    { url: "/models/nature/tree_fat.glb", scale: 2.6 },
    { url: "/models/nature/tree_simple.glb", scale: 2.4 },
  ] as ModelSpec[],
  bushes: [
    { url: "/models/nature/plant_bush.glb", scale: 2.4 },
    { url: "/models/nature/plant_bushLarge.glb", scale: 2.4 },
    { url: "/models/nature/plant_bushSmall.glb", scale: 2.4 },
  ] as ModelSpec[],
  flowers: [
    { url: "/models/nature/flower_redA.glb", scale: 2.2 },
    { url: "/models/nature/flower_yellowA.glb", scale: 2.2 },
    { url: "/models/nature/flower_purpleA.glb", scale: 2.2 },
  ] as ModelSpec[],
  rocks: [
    { url: "/models/nature/rock_smallA.glb", scale: 2.2 },
    { url: "/models/nature/rock_largeA.glb", scale: 1.6 },
  ] as ModelSpec[],
  grass: [
    { url: "/models/nature/grass.glb", scale: 2.2 },
    { url: "/models/nature/grass_large.glb", scale: 2.2 },
  ] as ModelSpec[],
  logStack: { url: "/models/nature/log_stack.glb", scale: 2.2 } as ModelSpec,
  stump: { url: "/models/nature/stump_round.glb", scale: 2.2 } as ModelSpec,
  pathStone: { url: "/models/nature/path_stone.glb", scale: 1.3 } as ModelSpec,
  barrel: { url: "/models/survival/barrel.glb", scale: 2.2 } as ModelSpec,
  crate: { url: "/models/survival/box.glb", scale: 2.4 } as ModelSpec,
  bucket: { url: "/models/survival/bucket.glb", scale: 2.4 } as ModelSpec,
  signpost: { url: "/models/survival/signpost.glb", scale: 2.4 } as ModelSpec,
};

/**
 * Player character. Kenney "Mini Characters" (CC0): skinned, with idle/walk/sprint/jump/fall/pick-up
 * clips. `animations` maps controller states -> clip names in the glb; swap both to change character
 * (e.g. Quaternius "Ultimate Animated Character": idle -> "Idle", walk -> "Walk", run -> "Run").
 */
export const PLAYER_MODEL = {
  url: "/models/characters/character-male-a.glb",
  scale: 1.9,
  /** Feet offset from the capsule centre (capsuleHalfHeight + capsuleRadius + floatHeight). */
  y: -0.95,
  animations: {
    idle: "idle",
    walk: "walk",
    run: "sprint",
    jump: "jump",
    jumpIdle: "fall",
    jumpLand: "idle",
    fall: "fall",
    action1: "pick-up",
  },
};

/** Every glb referenced above — preloaded once the scene mounts. */
export function allModelUrls(): string[] {
  const urls = new Set<string>();
  const add = (s: ModelSpec) => "url" in s && urls.add(s.url);
  Object.values(CROP_MODELS).forEach((c) => c.stages.flat().forEach(add));
  Object.values(ANIMAL_MODELS).forEach(add);
  Object.values(PROP_MODELS).forEach((p) => (Array.isArray(p) ? p.forEach(add) : add(p)));
  urls.add(PLAYER_MODEL.url);
  return [...urls];
}

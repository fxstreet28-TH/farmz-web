// v3 walkable world layout (units ≈ meters; the player is ~1.3 tall).
//
//            N (-z)
//   pond        barn/market
//   field   path   barnyard pen
//        board  spawn
//            S (+z)

export const WORLD_HALF = 19; // invisible walls at ±WORLD_HALF
export const PLOT_SPACING = 1.9; // 1.2 soil + 0.7 walkway
export const FIELD_CENTER: [number, number] = [-6, -0.5]; // x, z
export const PEN = { x: 6.5, z: 0, w: 7, d: 6, gate: 1.8 }; // gate gap in the front (south) fence
export const BARN_POS: [number, number, number] = [6.5, 0, -8];
export const MARKET_POS: [number, number, number] = [6.5, 0, -5.9]; // in front of the barn doors
export const POND = { x: -7, z: -9.5, r: 2.4 };
export const BOARD_POS: [number, number, number] = [1.6, 0, 3.2]; // mission board
export const SPAWN: [number, number, number] = [0, 2, 6];

export function plotPosition(index: number, count: number): [number, number, number] {
  const cols = Math.max(3, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = FIELD_CENTER[0] + (col - (cols - 1) / 2) * PLOT_SPACING;
  const z = FIELD_CENTER[1] + (row - (rows - 1) / 2) * PLOT_SPACING;
  return [x, 0, z];
}

export function fieldSize(count: number): [number, number] {
  const cols = Math.max(3, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  return [cols * PLOT_SPACING + 0.6, rows * PLOT_SPACING + 0.6];
}

/** Small deterministic PRNG so scenery doesn't reshuffle between renders. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

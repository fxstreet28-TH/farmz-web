// World layout (units ~ meters). Field on the left, barnyard pen on the right, barn behind it.
export const PLOT_SPACING = 1.4;
export const FIELD_CENTER: [number, number] = [-2.4, 0.6]; // x, z
export const PEN = { x: 3.6, z: 0.4, w: 4.4, d: 3.8 }; // center + size
export const BARN_POS: [number, number, number] = [3.6, 0, -3.6];
export const CAMERA_TARGET: [number, number, number] = [0.4, 0, 0.2];

export function plotPosition(index: number, count: number): [number, number, number] {
  const cols = Math.max(3, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = FIELD_CENTER[0] + (col - (cols - 1) / 2) * PLOT_SPACING;
  const z = FIELD_CENTER[1] + (row - (rows - 1) / 2) * PLOT_SPACING;
  return [x, 0, z];
}

/** Small deterministic PRNG so scenery doesn't reshuffle between renders. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

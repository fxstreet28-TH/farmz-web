"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { MathUtils, type PerspectiveCamera } from "three";

const POLAR = 0.9; // ~52° from vertical: the Harvest Moon look
const FARM_WIDTH = 12; // world units that should fit across the screen

/**
 * Frames the farm for the current screen. Portrait phones get a diagonal view (field in front,
 * pen behind) and a distance that fits the narrow horizontal FOV. Runs on mount and when the
 * orientation class changes — not on every resize, so it never fights the player's camera.
 */
export function CameraRig({ target }: { target: [number, number, number] }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as { target: { set: (...a: number[]) => void }; update: () => void } | null;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const portrait = aspect < 0.85;
  // Portrait: bias toward the field, which is the busiest part of the farm.
  const tx = target[0] + (portrait ? -0.9 : 0);
  const ty = target[1];
  const tz = target[2] + (portrait ? 0.3 : 0);

  useEffect(() => {
    const vHalf = MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const width = portrait ? FARM_WIDTH * 0.72 : FARM_WIDTH;
    const dist = MathUtils.clamp(width / 2 / Math.tan(hHalf), 17, 30);
    const azimuth = portrait ? -0.8 : 0;
    camera.position.set(
      tx + dist * Math.sin(POLAR) * Math.sin(azimuth),
      ty + dist * Math.cos(POLAR),
      tz + dist * Math.sin(POLAR) * Math.cos(azimuth),
    );
    camera.lookAt(tx, ty, tz);
    if (controls) {
      controls.target.set(tx, ty, tz);
      controls.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reframe only on orientation/target change
  }, [portrait, tx, ty, tz, controls, camera]);

  return null;
}

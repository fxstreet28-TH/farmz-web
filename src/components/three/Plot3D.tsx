"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { CROP_MODELS, FALLBACK_CROP } from "@/config/assets";
import { cropStage } from "@/lib/farmActions";
import { emoji } from "@/lib/emoji";
import { formatDuration, serverNow } from "@/lib/game";
import { useInteractable, useInteraction } from "@/lib/interaction";
import type { Plot } from "@/lib/types";
import { ModelStack } from "./Model";

export interface HarvestFx {
  cropId: string;
  label: string;
  at: number;
}

export function Plot3D({
  plot,
  position,
  now,
  busy,
  fx,
  cropName,
  onPlant,
  onHarvest,
  lowQuality,
}: {
  plot: Plot;
  position: [number, number, number];
  now: number;
  busy: boolean;
  fx: HarvestFx | null;
  cropName?: string;
  onPlant: (plot: Plot) => void;
  onHarvest: (plot: Plot) => void;
  lowQuality: boolean;
}) {
  const { stage } = cropStage(plot, now);
  const cropId = plot.crop_id;
  const specs = cropId ? (CROP_MODELS[cropId] ?? FALLBACK_CROP).stages[stage] : null;
  const cropRef = useRef<Group>(null);
  const grow = useRef(1);
  const stageKey = `${cropId}:${stage}`;
  const id = `plot:${plot.id}`;
  const focused = useInteraction((s) => s.focusId === id);
  const ready = plot.state !== "empty" && stage === 2;

  useInteractable(id, {
    pos: () => [position[0], position[2]],
    radius: 1.35,
    prompt: () => {
      if (busy) return { icon: "⏳", label: "Working…", actionable: false };
      if (plot.state === "empty") return { icon: "🌱", label: "Plant", actionable: true };
      const s = cropStage(plot, serverNow());
      const name = cropName ?? plot.crop_id ?? "crop";
      if (s.stage === 2) return { icon: "⛏️", label: `Harvest ${name}`, actionable: true };
      // Still growing: the server decides; trying early just gets a friendly NOT_READY.
      return { icon: "⏳", label: `${name} · ${formatDuration(s.remaining)}`, actionable: true };
    },
    act: () => (plot.state === "empty" ? onPlant(plot) : onHarvest(plot)),
  });

  // Pop-in whenever the crop or its stage changes.
  useEffect(() => {
    grow.current = 0.25;
  }, [stageKey]);

  useFrame((state, dt) => {
    const g = cropRef.current;
    if (!g) return;
    grow.current += (1 - grow.current) * Math.min(1, dt * 7);
    const bounce = 1 + Math.sin((1 - grow.current) * Math.PI) * 0.15;
    g.scale.setScalar(grow.current * bounce);
    g.rotation.z = stage === 2 ? Math.sin(state.clock.elapsedTime * 2.4 + position[0]) * 0.06 : 0;
  });

  return (
    <group position={position}>
      {(focused || ready) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.8, focused ? 0.95 : 0.88, 28]} />
          <meshBasicMaterial color={focused ? "#ffffff" : "#ffdd55"} transparent opacity={0.9} />
        </mesh>
      )}

      {specs && (
        <group ref={cropRef} position={[0, 0.26, 0]}>
          <Suspense fallback={null}>
            <ModelStack specs={specs} castShadow={!lowQuality} />
          </Suspense>
        </group>
      )}

      {fx && <HarvestBurst key={fx.at} fx={fx} />}

      {/* Ready crops advertise themselves; details show in the HUD prompt when you walk up. */}
      {ready && !focused && (
        <Html position={[0, 1.5, 0]} center distanceFactor={10} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="animate-wiggle whitespace-nowrap rounded-full border-2 border-white bg-sun-400 px-2 py-0.5 font-display text-sm font-extrabold text-soil-600 shadow-chunky-sm">
            {emoji(cropId)} Ready!
          </div>
        </Html>
      )}
    </group>
  );
}

/** Crop jumps out of the soil and a "+N item" floats up. */
function HarvestBurst({ fx }: { fx: HarvestFx }) {
  const ref = useRef<Group>(null);
  const [done, setDone] = useState(false);
  const t = useRef(0);
  const specs = (CROP_MODELS[fx.cropId] ?? FALLBACK_CROP).stages[2];

  useFrame((_, dt) => {
    if (!ref.current || done) return;
    t.current += dt;
    const k = Math.min(1, t.current / 0.7);
    ref.current.position.y = 0.26 + Math.sin(k * Math.PI) * 1.2 + k * 0.6;
    ref.current.rotation.y = k * Math.PI * 2;
    ref.current.scale.setScalar(1 - k * 0.9);
    if (k >= 1) setDone(true);
  });

  return (
    <>
      {!done && (
        <group ref={ref} position={[0, 0.26, 0]}>
          <Suspense fallback={null}>
            <ModelStack specs={specs} castShadow={false} />
          </Suspense>
        </group>
      )}
      <Html position={[0, 1.4, 0]} center style={{ pointerEvents: "none" }}>
        <div className="animate-float-up whitespace-nowrap font-display text-xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.45)]">
          {fx.label}
        </div>
      </Html>
    </>
  );
}

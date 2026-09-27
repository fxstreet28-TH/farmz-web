"use client";

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { CROP_MODELS, FALLBACK_CROP } from "@/config/assets";
import { cropStage } from "@/lib/farmActions";
import { emoji } from "@/lib/emoji";
import { formatDuration } from "@/lib/game";
import type { Plot } from "@/lib/types";
import { ModelStack } from "./Model";

const CLICK_SLOP_PX = 8; // ignore clicks that were really camera drags

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
  hovered,
  onHover,
  onSelect,
  lowQuality,
}: {
  plot: Plot;
  position: [number, number, number];
  now: number;
  busy: boolean;
  fx: HarvestFx | null;
  hovered: boolean;
  onHover: (h: boolean) => void;
  onSelect: (plot: Plot) => void;
  lowQuality: boolean;
}) {
  const { stage, remaining } = cropStage(plot, now);
  const cropId = plot.crop_id;
  const specs = cropId ? (CROP_MODELS[cropId] ?? FALLBACK_CROP).stages[stage] : null;
  const cropRef = useRef<Group>(null);
  const grow = useRef(1);
  const stageKey = `${cropId}:${stage}`;

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
    // Ready crops sway to invite a tap.
    g.rotation.z = stage === 2 ? Math.sin(state.clock.elapsedTime * 2.4 + position[0]) * 0.06 : 0;
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_SLOP_PX || busy) return;
    onSelect(plot);
  };

  const ready = plot.state !== "empty" && stage === 2;

  return (
    <group position={position}>
      {/* hit box covers soil + crop */}
      <mesh
        position={[0, 0.5, 0]}
        onClick={click}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
      >
        <boxGeometry args={[1.25, 1, 1.25]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* selection / ready ring */}
      {(hovered || ready) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.78, 0.9, 24]} />
          <meshBasicMaterial color={ready ? "#ffdd55" : "#ffffff"} transparent opacity={ready ? 0.9 : 0.7} />
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

      <Html position={[0, stage === 2 ? 1.5 : 1.0, 0.25]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        {plot.state === "empty" ? (
          hovered && !fx ? (
            <div className="rounded-full bg-white/90 px-2 py-0.5 font-display text-xs font-extrabold text-grass-700 shadow-chunky-sm">
              ＋ Plant
            </div>
          ) : null
        ) : ready ? (
          <div className="animate-wiggle whitespace-nowrap rounded-full border-2 border-white bg-sun-400 px-2 py-0.5 font-display text-xs font-extrabold text-soil-600 shadow-chunky-sm">
            {emoji(cropId)} Harvest!
          </div>
        ) : (
          <div className="whitespace-nowrap rounded-full bg-grass-900/70 px-2 py-0.5 font-display text-[11px] font-bold tabular-nums text-white">
            ⏱ {formatDuration(remaining)}
          </div>
        )}
      </Html>
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

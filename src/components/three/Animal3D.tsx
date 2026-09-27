"use client";

import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Group, Object3D } from "three";
import { ANIMAL_MODELS, FALLBACK_ANIMAL, type ModelSpec } from "@/config/assets";
import { animalStatus } from "@/lib/farmActions";
import { emoji } from "@/lib/emoji";
import { formatDuration } from "@/lib/game";
import type { Animal } from "@/lib/types";
import { Procedural } from "./Procedural";
import { PEN, rng } from "./layout";

const CLICK_SLOP_PX = 8;

type Motion = "walk" | "idle" | "eat";

function hashId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Glb animal with its own clone so each one runs an independent animation mixer. */
function AnimatedGlb({ url, motion }: { url: string; motion: Motion }) {
  const { scene, animations } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o: Object3D) => {
      o.castShadow = true;
    });
    return c;
  }, [scene]);
  const root = useRef<Group>(null);
  const { actions } = useAnimations(animations, root);

  useEffect(() => {
    const a = actions[motion] ?? actions.idle;
    a?.reset().fadeIn(0.25).play();
    return () => {
      a?.fadeOut(0.25);
    };
  }, [actions, motion]);

  return (
    <group ref={root}>
      <primitive object={clone} />
    </group>
  );
}

function AnimalBody({ spec, motion }: { spec: ModelSpec; motion: Motion }) {
  return (
    <group position={[0, spec.y ?? 0, 0]} scale={spec.scale ?? 1}>
      {"url" in spec ? <AnimatedGlb url={spec.url} motion={motion} /> : <Procedural kind={spec.procedural} />}
    </group>
  );
}

export function Animal3D({
  animal,
  index,
  now,
  busy,
  label,
  produce,
  onSelect,
}: {
  animal: Animal;
  index: number;
  now: number;
  busy: boolean;
  label: string | null;
  produce?: string;
  onSelect: (a: Animal) => void;
}) {
  const spec = ANIMAL_MODELS[animal.type] ?? FALLBACK_ANIMAL;
  const { status, remaining } = animalStatus(animal, now);
  const group = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const [motion, setMotion] = useState<Motion>("idle");
  const [hovered, setHovered] = useState(false);

  // Wander state lives in refs (no re-render per frame).
  const rand = useMemo(() => rng(hashId(animal.id)), [animal.id]);
  const minX = PEN.x - PEN.w / 2 + spec.radius + 0.2;
  const maxX = PEN.x + PEN.w / 2 - spec.radius - 0.2;
  const minZ = PEN.z - PEN.d / 2 + spec.radius + 0.2;
  const maxZ = PEN.z + PEN.d / 2 - spec.radius - 0.2;
  const pos = useRef<[number, number]>([minX + rand() * (maxX - minX), minZ + rand() * (maxZ - minZ)]);
  const target = useRef<[number, number]>([...pos.current]);
  const pauseUntil = useRef(index * 0.7);
  const heading = useRef(rand() * Math.PI * 2);
  const motionRef = useRef<Motion>("idle");

  const setMotionOnce = (m: Motion) => {
    if (motionRef.current !== m) {
      motionRef.current = m;
      setMotion(m);
    }
  };

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const [x, z] = pos.current;
    const [tx, tz] = target.current;
    const dx = tx - x;
    const dz = tz - z;
    const dist = Math.hypot(dx, dz);

    if (t < pauseUntil.current || hovered) {
      setMotionOnce(status === "hungry" ? "eat" : "idle");
    } else if (dist < 0.05) {
      // Arrived: rest a bit, then pick a new spot in the pen.
      pauseUntil.current = t + 1.5 + rand() * 3.5;
      target.current = [minX + rand() * (maxX - minX), minZ + rand() * (maxZ - minZ)];
    } else {
      setMotionOnce("walk");
      const step = Math.min(dist, spec.walkSpeed * dt);
      pos.current = [x + (dx / dist) * step, z + (dz / dist) * step];
      const want = Math.atan2(dx, dz);
      let diff = want - heading.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      heading.current += diff * Math.min(1, dt * 6);
    }

    g.position.set(pos.current[0], 0, pos.current[1]);
    g.rotation.y = heading.current;
    // Procedural models have no clips: fake a little hop while walking.
    if (bodyRef.current && !("url" in spec)) {
      bodyRef.current.position.y = motionRef.current === "walk" ? Math.abs(Math.sin(t * 9)) * 0.06 : 0;
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_SLOP_PX || busy) return;
    onSelect(animal);
  };

  return (
    <group ref={group}>
      <group ref={bodyRef}>
        <Suspense fallback={null}>
          <AnimalBody spec={spec} motion={motion} />
        </Suspense>
      </group>

      <mesh
        position={[0, 0.5, 0]}
        onClick={click}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[spec.radius * 2, 1.1, spec.radius * 2.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[spec.radius + 0.1, spec.radius + 0.2, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      )}

      <Html position={[0, 1.35, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center gap-0.5">
          {label && (
            <div className="animate-float-up whitespace-nowrap font-display text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.45)]">
              {label}
            </div>
          )}
          {status === "hungry" ? (
            <div className="whitespace-nowrap rounded-full border-2 border-white bg-white/95 px-2 py-0.5 font-display text-[11px] font-extrabold text-grass-800 shadow-chunky-sm">
              🥺 Feed me
            </div>
          ) : status === "ready" ? (
            <div className="animate-wiggle whitespace-nowrap rounded-full border-2 border-white bg-sun-400 px-2 py-0.5 font-display text-xs font-extrabold text-soil-600 shadow-chunky-sm">
              {emoji(produce ?? animalProduce(animal.type))} Collect!
            </div>
          ) : (
            <div className="whitespace-nowrap rounded-full bg-grass-900/70 px-2 py-0.5 font-display text-[11px] font-bold tabular-nums text-white">
              {emoji(produce ?? animalProduce(animal.type))} {formatDuration(remaining)}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// Fallback before config loads; the server config (passed as `produce`) is authoritative.
function animalProduce(type: string) {
  return type === "cow" ? "milk" : type === "sheep" ? "wool" : "egg";
}

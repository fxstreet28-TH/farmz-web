"use client";

import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Quaternion, Vector3, type Group, type Object3D } from "three";
import { ANIMAL_MODELS, FALLBACK_ANIMAL, type ModelSpec } from "@/config/assets";
import { animalStatus } from "@/lib/farmActions";
import { emoji } from "@/lib/emoji";
import { formatDuration, serverNow } from "@/lib/game";
import { player, useInteractable, useInteraction } from "@/lib/interaction";
import type { Animal } from "@/lib/types";
import { Procedural } from "./Procedural";
import { PEN, rng } from "./layout";

type Motion = "walk" | "idle" | "eat";

const UP = new Vector3(0, 1, 0);
const tmpQ = new Quaternion();

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
  name,
  hasFeed,
  onFeed,
  onCollect,
}: {
  animal: Animal;
  index: number;
  now: number;
  busy: boolean;
  label: string | null;
  produce?: string;
  name: string;
  hasFeed: boolean;
  onFeed: (a: Animal) => void;
  onCollect: (a: Animal) => void;
}) {
  const spec = ANIMAL_MODELS[animal.type] ?? FALLBACK_ANIMAL;
  const { status } = animalStatus(animal, now);
  const rb = useRef<RapierRigidBody>(null);
  const bodyRef = useRef<Group>(null);
  const [motion, setMotion] = useState<Motion>("idle");
  const id = `animal:${animal.id}`;
  const focused = useInteraction((s) => s.focusId === id);
  const produceEmoji = emoji(produce ?? (animal.type === "cow" ? "milk" : animal.type === "sheep" ? "wool" : "egg"));

  // Wander state lives in refs (no re-render per frame).
  const rand = useMemo(() => rng(hashId(animal.id)), [animal.id]);
  const minX = PEN.x - PEN.w / 2 + spec.radius + 0.3;
  const maxX = PEN.x + PEN.w / 2 - spec.radius - 0.3;
  const minZ = PEN.z - PEN.d / 2 + spec.radius + 0.3;
  const maxZ = PEN.z + PEN.d / 2 - spec.radius - 0.6;
  const pos = useRef<[number, number]>([minX + rand() * (maxX - minX), minZ + rand() * (maxZ - minZ)]);
  const target = useRef<[number, number]>([...pos.current]);
  const pauseUntil = useRef(index * 0.7);
  const heading = useRef(rand() * Math.PI * 2);
  const motionRef = useRef<Motion>("idle");

  useInteractable(id, {
    pos: () => pos.current,
    radius: spec.radius + 1.4,
    prompt: () => {
      if (busy) return { icon: "⏳", label: "Working…", actionable: false };
      const s = animalStatus(animal, serverNow());
      if (s.status === "hungry") {
        return hasFeed
          ? { icon: "🥕", label: `Feed ${name}`, actionable: true }
          : { icon: "🛒", label: `${name} is hungry — buy feed`, actionable: true };
      }
      if (s.status === "ready") return { icon: "🧺", label: `Collect ${produceEmoji}`, actionable: true };
      return { icon: "⏳", label: `${produceEmoji} in ${formatDuration(s.remaining)}`, actionable: true };
    },
    act: () => (animalStatus(animal, serverNow()).status === "hungry" ? onFeed(animal) : onCollect(animal)),
  });

  const setMotionOnce = (m: Motion) => {
    if (motionRef.current !== m) {
      motionRef.current = m;
      setMotion(m);
    }
  };

  useFrame((state, dt) => {
    const body = rb.current;
    if (!body) return;
    const t = state.clock.elapsedTime;
    const [x, z] = pos.current;

    if (focused) {
      // Stop and look at the player while they're interacting.
      setMotionOnce(status === "hungry" ? "eat" : "idle");
      const want = Math.atan2(player.x - x, player.z - z);
      const diff = Math.atan2(Math.sin(want - heading.current), Math.cos(want - heading.current));
      heading.current += diff * Math.min(1, dt * 5);
    } else {
      const [tx, tz] = target.current;
      const dx = tx - x;
      const dz = tz - z;
      const dist = Math.hypot(dx, dz);
      if (t < pauseUntil.current) {
        setMotionOnce(status === "hungry" ? "eat" : "idle");
      } else if (dist < 0.05) {
        pauseUntil.current = t + 1.5 + rand() * 3.5;
        target.current = [minX + rand() * (maxX - minX), minZ + rand() * (maxZ - minZ)];
      } else {
        setMotionOnce("walk");
        const step = Math.min(dist, spec.walkSpeed * dt);
        pos.current = [x + (dx / dist) * step, z + (dz / dist) * step];
        const want = Math.atan2(dx, dz);
        const diff = Math.atan2(Math.sin(want - heading.current), Math.cos(want - heading.current));
        heading.current += diff * Math.min(1, dt * 6);
      }
    }

    body.setNextKinematicTranslation({ x: pos.current[0], y: 0, z: pos.current[1] });
    tmpQ.setFromAxisAngle(UP, heading.current);
    body.setNextKinematicRotation(tmpQ);
    if (bodyRef.current && !("url" in spec)) {
      bodyRef.current.position.y = motionRef.current === "walk" ? Math.abs(Math.sin(t * 9)) * 0.06 : 0;
    }
  });

  return (
    <RigidBody ref={rb} type="kinematicPosition" colliders={false} position={[pos.current[0], 0, pos.current[1]]}>
      <CapsuleCollider args={[0.25, spec.radius * 0.8]} position={[0, 0.25 + spec.radius * 0.8, 0]} />
      <group ref={bodyRef}>
        <Suspense fallback={null}>
          <AnimalBody spec={spec} motion={motion} />
        </Suspense>
      </group>

      {focused && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[spec.radius + 0.1, spec.radius + 0.22, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      )}

      <Html position={[0, 1.45, 0]} center distanceFactor={10} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center gap-0.5">
          {label && (
            <div className="animate-float-up whitespace-nowrap font-display text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.45)]">
              {label}
            </div>
          )}
          {status === "hungry" ? (
            <div className="whitespace-nowrap rounded-full border-2 border-white bg-white/95 px-2 py-0.5 font-display text-xs font-extrabold text-grass-800 shadow-chunky-sm">
              🥺
            </div>
          ) : status === "ready" ? (
            <div className="animate-wiggle whitespace-nowrap rounded-full border-2 border-white bg-sun-400 px-2 py-0.5 font-display text-sm font-extrabold text-soil-600 shadow-chunky-sm">
              {produceEmoji}!
            </div>
          ) : null}
        </div>
      </Html>
    </RigidBody>
  );
}

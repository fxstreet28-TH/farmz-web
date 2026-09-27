"use client";

import { Clone, Html, Instance, Instances, useGLTF } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { memo, Suspense, useMemo } from "react";
import { PROP_MODELS, type ModelSpec } from "@/config/assets";
import { Model } from "./Model";
import { BARN_POS, BOARD_POS, FIELD_CENTER, MARKET_POS, PEN, POND, WORLD_HALF, fieldSize, rng } from "./layout";

// ---------- helpers ----------

/** Keeps scatter (trees, grass, flowers) off the playable areas and paths. */
function blocked(x: number, z: number, pad = 0) {
  const inRect = (cx: number, cz: number, w: number, d: number) =>
    Math.abs(x - cx) < w / 2 + pad && Math.abs(z - cz) < d / 2 + pad;
  return (
    inRect(FIELD_CENTER[0], FIELD_CENTER[1], 8.5, 8.5) ||
    inRect(PEN.x, PEN.z, PEN.w + 1.5, PEN.d + 1.5) ||
    inRect(BARN_POS[0], BARN_POS[2] - 0.5, 7, 6) ||
    inRect(0, 2, 2.4, 18) || // north-south path
    inRect(0, -4.6, 16, 2.2) || // east-west path
    inRect(BOARD_POS[0], BOARD_POS[2], 2, 2) ||
    Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.2 + pad
  );
}

function FencePanel({ spec, position, rotY, length }: { spec: ModelSpec; position: [number, number, number]; rotY: number; length: number }) {
  const { scene } = useGLTF("url" in spec ? spec.url : "");
  const s = spec.scale ?? 1;
  // Kenney fence panels sit on the back edge of their 1x1 tile (z ≈ -0.46); recentre them.
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <group scale={[length, s, s]} position={[0, 0, 0.46 * s]}>
        <Clone object={scene} castShadow receiveShadow />
      </group>
    </group>
  );
}

// ---------- barnyard fence (visual panels + 5 box colliders, gap = gate) ----------

function PenFence() {
  const { panels, colliders } = useMemo(() => {
    const panels: { pos: [number, number, number]; rotY: number; len: number }[] = [];
    const colliders: { pos: [number, number, number]; half: [number, number, number] }[] = [];
    const run = (x0: number, z0: number, x1: number, z1: number, rotY: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      if (len < 0.2) return;
      const n = Math.max(1, Math.round(len / 1.2));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        panels.push({ pos: [x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t], rotY, len: len / n });
      }
      const horizontal = Math.abs(z1 - z0) < 1e-6;
      colliders.push({
        pos: [(x0 + x1) / 2, 0.5, (z0 + z1) / 2],
        half: horizontal ? [len / 2, 0.5, 0.08] : [0.08, 0.5, len / 2],
      });
    };
    const l = PEN.x - PEN.w / 2;
    const r = PEN.x + PEN.w / 2;
    const b = PEN.z - PEN.d / 2;
    const f = PEN.z + PEN.d / 2;
    const g0 = PEN.x - PEN.gate / 2;
    const g1 = PEN.x + PEN.gate / 2;
    run(l, b, r, b, 0); // back
    run(l, f, g0, f, Math.PI); // front-left of gate
    run(g1, f, r, f, Math.PI); // front-right of gate
    run(l, b, l, f, Math.PI / 2); // left
    run(r, b, r, f, -Math.PI / 2); // right
    return { panels, colliders };
  }, []);

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        {colliders.map((c, i) => (
          <CuboidCollider key={i} args={c.half} position={c.pos} />
        ))}
      </RigidBody>
      {panels.map((p, i) => (
        <FencePanel key={i} spec={PROP_MODELS.fence} position={p.pos} rotY={p.rotY} length={p.len} />
      ))}
      {/* gate posts */}
      {[PEN.x - PEN.gate / 2, PEN.x + PEN.gate / 2].map((x) => (
        <mesh key={x} castShadow position={[x, 0.45, PEN.z + PEN.d / 2]}>
          <boxGeometry args={[0.16, 0.9, 0.16]} />
          <meshStandardMaterial color="#8a5d35" flatShading />
        </mesh>
      ))}
    </>
  );
}

// ---------- landmarks ----------

function Landmark({ position, children, label }: { position: [number, number, number]; children: React.ReactNode; label: string }) {
  return (
    <group position={position}>
      {children}
      <Html position={[0, 2.6, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-full border-2 border-white bg-grass-600/90 px-2.5 py-0.5 font-display text-xs font-extrabold text-white shadow-chunky-sm">
          {label}
        </div>
      </Html>
    </group>
  );
}

function MissionBoard() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.8, 0.8, 0.12]} position={[0, 0.8, 0]} />
      </RigidBody>
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} castShadow position={[x, 0.75, 0]}>
          <boxGeometry args={[0.12, 1.5, 0.12]} />
          <meshStandardMaterial color="#6d4726" flatShading />
        </mesh>
      ))}
      <mesh castShadow position={[0, 1.15, 0]}>
        <boxGeometry args={[1.5, 0.8, 0.08]} />
        <meshStandardMaterial color="#c89a6a" flatShading />
      </mesh>
      {[[-0.4, 1.25], [0.15, 1.1], [0.45, 1.3]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.05]}>
          <planeGeometry args={[0.36, 0.42]} />
          <meshStandardMaterial color={["#fff6cc", "#e3f4ff", "#fde2e4"][i]} />
        </mesh>
      ))}
    </group>
  );
}

function MarketStall() {
  return (
    <group>
      {/* counter */}
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[2, 0.9, 0.7]} />
        <meshStandardMaterial color="#a97a4b" flatShading />
      </mesh>
      {/* awning posts + striped awning */}
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} castShadow position={[x, 1.2, -0.3]}>
          <boxGeometry args={[0.08, 2.4, 0.08]} />
          <meshStandardMaterial color="#6d4726" />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} castShadow position={[-0.8 + i * 0.4, 2.35, 0]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.4, 0.05, 1]} />
          <meshStandardMaterial color={i % 2 ? "#ffffff" : "#e74c3c"} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Pond() {
  const stones = useMemo(() => {
    const r = rng(99);
    return Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2 + r() * 0.2;
      return { x: Math.cos(a) * (POND.r + 0.25), z: Math.sin(a) * (POND.r + 0.25), s: 0.7 + r() * 0.6, ry: r() * 6 };
    });
  }, []);
  return (
    <group position={[POND.x, 0, POND.z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.6, POND.r + 0.2]} position={[0, 0.6, 0]} />
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[POND.r + 0.35, 28]} />
        <meshStandardMaterial color="#c9a36a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[POND.r, 28]} />
        <meshStandardMaterial color="#55b9f5" transparent opacity={0.85} roughness={0.15} metalness={0.1} />
      </mesh>
      {stones.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.ry, 0]} scale={s.s}>
          <Model spec={PROP_MODELS.rocks[0]} castShadow={false} />
        </group>
      ))}
    </group>
  );
}

function GrassTufts({ count }: { count: number }) {
  const tufts = useMemo(() => {
    const r = rng(7);
    const out: { p: [number, number, number]; s: number; c: string; ry: number }[] = [];
    let guard = 0;
    while (out.length < count && guard++ < count * 30) {
      const x = (r() - 0.5) * WORLD_HALF * 2;
      const z = (r() - 0.5) * WORLD_HALF * 2;
      if (blocked(x, z)) continue;
      out.push({ p: [x, 0, z], s: 0.6 + r() * 0.9, c: r() > 0.5 ? "#6fbf3a" : "#86d14c", ry: r() * Math.PI });
    }
    return out;
  }, [count]);

  return (
    <Instances limit={count}>
      <coneGeometry args={[0.12, 0.35, 4]} />
      <meshStandardMaterial flatShading />
      {tufts.map((t, i) => (
        <Instance key={i} position={[t.p[0], 0.15 * t.s, t.p[2]]} scale={t.s} color={t.c} rotation={[0, t.ry, 0]} />
      ))}
    </Instances>
  );
}

/** Trees: a dense ring along the map edge plus a few groves inside. All get trunk colliders. */
function useTrees(lowQuality: boolean) {
  return useMemo(() => {
    const r = rng(11);
    const out: { x: number; z: number; ry: number; k: number; s: number }[] = [];
    const edge = WORLD_HALF - 1.2;
    const step = lowQuality ? 3.6 : 2.6;
    for (let t = -edge; t <= edge; t += step) {
      for (const [x, z] of [[t, -edge], [t, edge], [-edge, t], [edge, t]] as [number, number][]) {
        const jx = x + (r() - 0.5) * 1.2;
        const jz = z + (r() - 0.5) * 1.2;
        if (Math.abs(jz - edge) < 2 && Math.abs(jx) < 2.5) continue; // leave the south entrance open-looking
        out.push({ x: jx, z: jz, ry: r() * 6.28, k: Math.floor(r() * 1000), s: 0.9 + r() * 0.5 });
      }
    }
    let guard = 0;
    const inner = lowQuality ? 8 : 16;
    let placed = 0;
    while (placed < inner && guard++ < 600) {
      const x = (r() - 0.5) * (WORLD_HALF * 2 - 6);
      const z = (r() - 0.5) * (WORLD_HALF * 2 - 6);
      if (blocked(x, z, 1.2) || (z > 5 && Math.abs(x) < 5)) continue;
      out.push({ x, z, ry: r() * 6.28, k: Math.floor(r() * 1000), s: 0.85 + r() * 0.5 });
      placed++;
    }
    return out;
  }, [lowQuality]);
}

function scatter(seed: number, n: number) {
  const r = rng(seed);
  const out: { x: number; z: number; ry: number; k: number }[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 50) {
    const x = (r() - 0.5) * (WORLD_HALF * 2 - 4);
    const z = (r() - 0.5) * (WORLD_HALF * 2 - 4);
    if (blocked(x, z, 0.3)) continue;
    out.push({ x, z, ry: r() * Math.PI * 2, k: Math.floor(r() * 1000) });
  }
  return out;
}

// ---------- scene ----------

export const Scenery = memo(function Scenery({ lowQuality, plotCount }: { lowQuality: boolean; plotCount: number }) {
  const trees = useTrees(lowQuality);
  const bushes = useMemo(() => scatter(23, lowQuality ? 8 : 18), [lowQuality]);
  const flowers = useMemo(() => scatter(37, lowQuality ? 12 : 30), [lowQuality]);
  const rocks = useMemo(() => scatter(51, 8), []);
  const [fw, fd] = fieldSize(plotCount);

  return (
    <group>
      {/* walkable ground + invisible walls at the map edge */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[WORLD_HALF + 8, 0.5, WORLD_HALF + 8]} position={[0, -0.5, 0]} />
        <CuboidCollider args={[WORLD_HALF, 3, 0.5]} position={[0, 3, -WORLD_HALF - 0.5]} />
        <CuboidCollider args={[WORLD_HALF, 3, 0.5]} position={[0, 3, WORLD_HALF + 0.5]} />
        <CuboidCollider args={[0.5, 3, WORLD_HALF]} position={[-WORLD_HALF - 0.5, 3, 0]} />
        <CuboidCollider args={[0.5, 3, WORLD_HALF]} position={[WORLD_HALF + 0.5, 3, 0]} />
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[70, 48]} />
        <meshStandardMaterial color="#8fcf52" />
      </mesh>

      {/* paths */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 2.5]} receiveShadow>
        <planeGeometry args={[1.8, 19]} />
        <meshStandardMaterial color="#d9b27a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.25, 0.007, -4.6]} receiveShadow>
        <planeGeometry args={[15, 1.8]} />
        <meshStandardMaterial color="#d9b27a" />
      </mesh>
      {/* tilled field base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[FIELD_CENTER[0], 0.005, FIELD_CENTER[1]]} receiveShadow>
        <planeGeometry args={[fw, fd]} />
        <meshStandardMaterial color="#b9955f" />
      </mesh>
      {/* barnyard dirt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PEN.x, 0.004, PEN.z]} receiveShadow>
        <planeGeometry args={[PEN.w - 0.2, PEN.d - 0.2]} />
        <meshStandardMaterial color="#a8c86a" />
      </mesh>

      <GrassTufts count={lowQuality ? 120 : 320} />

      <Suspense fallback={null}>
        <PenFence />

        {/* barn (solid) */}
        <group position={BARN_POS}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[1.55, 1.8, 1.25]} position={[0, 1.8, 0]} />
          </RigidBody>
          <Model spec={PROP_MODELS.barn} />
        </group>

        <Landmark position={MARKET_POS} label="🛒 Market">
          <group position={[-2.6, 0, -0.35]}>
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider args={[1, 0.45, 0.35]} position={[0, 0.45, 0]} />
            </RigidBody>
            <MarketStall />
            <group position={[-0.5, 0.9, 0.05]}>
              <Model spec={PROP_MODELS.crate} castShadow={false} />
            </group>
            <group position={[0.4, 0.9, 0]}>
              <Model spec={{ url: "/models/food/tomato.glb", scale: 2.2 }} castShadow={false} />
            </group>
            <group position={[0.7, 0.9, 0.1]}>
              <Model spec={{ url: "/models/food/corn.glb", scale: 1.6 }} castShadow={false} />
            </group>
          </group>
        </Landmark>

        <Landmark position={BOARD_POS} label="📋 Missions">
          <MissionBoard />
        </Landmark>

        <Pond />

        {/* barn props */}
        <group position={[BARN_POS[0] - 2.4, 0, BARN_POS[2] + 0.3]}>
          <Model spec={PROP_MODELS.haybale} />
        </group>
        <group position={[BARN_POS[0] - 2.6, 0.6, BARN_POS[2] - 0.2]} rotation={[0, 0.4, 0]}>
          <Model spec={PROP_MODELS.haybale} />
        </group>
        <group position={[BARN_POS[0] + 2.2, 0, BARN_POS[2] + 0.6]}>
          <Model spec={PROP_MODELS.barrel} />
        </group>
        <group position={[BARN_POS[0] + 2.6, 0, BARN_POS[2] + 1.2]} rotation={[0, 0.6, 0]}>
          <Model spec={PROP_MODELS.crate} />
        </group>
        <group position={[PEN.x + 1.8, 0, PEN.z - PEN.d / 2 + 0.6]}>
          <Model spec={PROP_MODELS.trough} />
        </group>
        <group position={[PEN.x - 2.6, 0, PEN.z - PEN.d / 2 + 0.5]}>
          <Model spec={PROP_MODELS.bucket} />
        </group>
        <group position={[1.4, 0, 9.5]} rotation={[0, -0.3, 0]}>
          <Model spec={PROP_MODELS.signpost} />
        </group>
        <group position={[FIELD_CENTER[0] - 4.8, 0, FIELD_CENTER[1] - 3.5]} rotation={[0, 0.5, 0]}>
          <Model spec={PROP_MODELS.logStack} />
        </group>
        <group position={[FIELD_CENTER[0] + 4.6, 0, FIELD_CENTER[1] + 4.2]}>
          <Model spec={PROP_MODELS.stump} />
        </group>

        {/* trees: visuals + trunk colliders in one fixed body */}
        <RigidBody type="fixed" colliders={false}>
          {trees.map((t, i) => (
            <CylinderCollider key={i} args={[1.2, 0.35 * t.s]} position={[t.x, 1.2, t.z]} />
          ))}
        </RigidBody>
        {trees.map((t, i) => (
          <group key={`t${i}`} position={[t.x, 0, t.z]} rotation={[0, t.ry, 0]} scale={t.s}>
            <Model spec={PROP_MODELS.trees[t.k % PROP_MODELS.trees.length]} castShadow={!lowQuality} />
          </group>
        ))}
        {bushes.map((t, i) => (
          <group key={`b${i}`} position={[t.x, 0, t.z]} rotation={[0, t.ry, 0]}>
            <Model spec={PROP_MODELS.bushes[t.k % PROP_MODELS.bushes.length]} castShadow={false} />
          </group>
        ))}
        {flowers.map((t, i) => (
          <group key={`f${i}`} position={[t.x, 0, t.z]} rotation={[0, t.ry, 0]}>
            <Model spec={PROP_MODELS.flowers[t.k % PROP_MODELS.flowers.length]} castShadow={false} />
          </group>
        ))}
        {rocks.map((t, i) => (
          <group key={`r${i}`} position={[t.x, 0, t.z]} rotation={[0, t.ry, 0]}>
            <Model spec={PROP_MODELS.rocks[t.k % PROP_MODELS.rocks.length]} castShadow={false} />
          </group>
        ))}
      </Suspense>
    </group>
  );
});

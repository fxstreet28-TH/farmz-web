"use client";

import { Clone, Instance, Instances, useGLTF } from "@react-three/drei";
import { memo, Suspense, useMemo } from "react";
import { PROP_MODELS, type ModelSpec } from "@/config/assets";
import { Model } from "./Model";
import { BARN_POS, FIELD_CENTER, PEN, rng } from "./layout";

function FencePanel({
  spec,
  position,
  rotY,
  length,
}: {
  spec: ModelSpec;
  position: [number, number, number];
  rotY: number;
  length: number;
}) {
  const url = "url" in spec ? spec.url : "";
  const { scene } = useGLTF(url);
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

function PenFence() {
  const panels = useMemo(() => {
    const out: { pos: [number, number, number]; rotY: number; len: number; gate: boolean }[] = [];
    const side = (x0: number, z0: number, x1: number, z1: number, rotY: number, gateMiddle: boolean) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(len / 1.2));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        out.push({
          pos: [x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t],
          rotY,
          len: len / n,
          gate: gateMiddle && i === Math.floor(n / 2),
        });
      }
    };
    const l = PEN.x - PEN.w / 2;
    const r = PEN.x + PEN.w / 2;
    const b = PEN.z - PEN.d / 2;
    const f = PEN.z + PEN.d / 2;
    side(l, b, r, b, 0, false); // back
    side(l, f, r, f, Math.PI, true); // front, gate in the middle
    side(l, b, l, f, Math.PI / 2, false); // left
    side(r, b, r, f, -Math.PI / 2, false); // right
    return out;
  }, []);

  return (
    <>
      {panels.map((p, i) =>
        p.gate ? (
          <group key={i} position={p.pos} rotation={[0, p.rotY, 0]}>
            <group position={[0, 0.2, 0.25 * 1.2]}>
              <Model spec={PROP_MODELS.fenceGate} />
            </group>
          </group>
        ) : (
          <FencePanel key={i} spec={PROP_MODELS.fence} position={p.pos} rotY={p.rotY} length={p.len} />
        ),
      )}
    </>
  );
}

/** Is (x, z) inside the playable area (field, pen, barn, path)? Keeps scatter out of the way. */
function blocked(x: number, z: number) {
  const inRect = (cx: number, cz: number, w: number, d: number) => Math.abs(x - cx) < w / 2 && Math.abs(z - cz) < d / 2;
  return (
    inRect(FIELD_CENTER[0], FIELD_CENTER[1], 6.2, 6.2) ||
    inRect(PEN.x, PEN.z, PEN.w + 1.4, PEN.d + 1.4) ||
    inRect(BARN_POS[0], BARN_POS[2], 5, 4) ||
    inRect(0.6, 4, 1.8, 8)
  );
}

function GrassTufts({ count }: { count: number }) {
  const tufts = useMemo(() => {
    const r = rng(7);
    const out: { p: [number, number, number]; s: number; c: string; ry: number }[] = [];
    let guard = 0;
    while (out.length < count && guard++ < count * 20) {
      const x = (r() - 0.5) * 26;
      const z = (r() - 0.5) * 22;
      if (blocked(x, z) || Math.hypot(x, z) > 13) continue;
      out.push({ p: [x, 0, z], s: 0.6 + r() * 0.8, c: r() > 0.5 ? "#6fbf3a" : "#86d14c", ry: r() * Math.PI });
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

function scatter(seed: number, n: number, rMin: number, rMax: number, avoidFront = true) {
  const r = rng(seed);
  const out: { x: number; z: number; ry: number; k: number }[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 40) {
    const a = r() * Math.PI * 2;
    const d = rMin + r() * (rMax - rMin);
    const x = Math.cos(a) * d + 0.4;
    const z = Math.sin(a) * d * 0.85;
    if (blocked(x, z)) continue;
    if (avoidFront && z > 4 && Math.abs(x) < 7) continue; // keep the camera's view clear
    out.push({ x, z, ry: r() * Math.PI * 2, k: Math.floor(r() * 1000) });
  }
  return out;
}

export const Scenery = memo(function Scenery({ lowQuality }: { lowQuality: boolean }) {
  const trees = useMemo(() => scatter(11, lowQuality ? 14 : 24, 7.5, 13), [lowQuality]);
  const bushes = useMemo(() => scatter(23, lowQuality ? 6 : 12, 5.5, 10), [lowQuality]);
  const flowers = useMemo(() => scatter(37, lowQuality ? 8 : 18, 4, 10, false), [lowQuality]);
  const rocks = useMemo(() => scatter(51, 6, 5, 11), []);

  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[40, 48]} />
        <meshStandardMaterial color="#8fcf52" />
      </mesh>
      {/* dirt path from the front edge up between field and pen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.6, 0.005, 4.2]} receiveShadow>
        <planeGeometry args={[1.4, 8]} />
        <meshStandardMaterial color="#d9b27a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[FIELD_CENTER[0], 0.004, FIELD_CENTER[1]]} receiveShadow>
        <planeGeometry args={[4.9, 4.9]} />
        <meshStandardMaterial color="#b9955f" />
      </mesh>

      <GrassTufts count={lowQuality ? 60 : 140} />

      <Suspense fallback={null}>
        <PenFence />

        <group position={BARN_POS}>
          <Model spec={PROP_MODELS.barn} />
        </group>
        <group position={[BARN_POS[0] - 2.1, 0, BARN_POS[2] + 1.1]}>
          <Model spec={PROP_MODELS.haybale} />
        </group>
        <group position={[BARN_POS[0] - 2.2, 0.6, BARN_POS[2] + 0.6]} rotation={[0, 0.4, 0]}>
          <Model spec={PROP_MODELS.haybale} />
        </group>
        <group position={[BARN_POS[0] + 2.1, 0, BARN_POS[2] + 1]}>
          <Model spec={PROP_MODELS.barrel} />
        </group>
        <group position={[BARN_POS[0] + 2.5, 0, BARN_POS[2] + 1.5]} rotation={[0, 0.6, 0]}>
          <Model spec={PROP_MODELS.crate} />
        </group>
        <group position={[PEN.x + 1.2, 0, PEN.z - PEN.d / 2 + 0.6]}>
          <Model spec={PROP_MODELS.trough} />
        </group>
        <group position={[PEN.x - 1.5, 0, PEN.z - PEN.d / 2 + 0.5]}>
          <Model spec={PROP_MODELS.bucket} />
        </group>
        <group position={[1.35, 0, 6.2]} rotation={[0, -0.3, 0]}>
          <Model spec={PROP_MODELS.signpost} />
        </group>
        <group position={[FIELD_CENTER[0] - 3.4, 0, FIELD_CENTER[1] - 2.6]} rotation={[0, 0.5, 0]}>
          <Model spec={PROP_MODELS.logStack} />
        </group>
        <group position={[FIELD_CENTER[0] + 3.3, 0, FIELD_CENTER[1] - 3.2]}>
          <Model spec={PROP_MODELS.stump} />
        </group>

        {trees.map((t, i) => (
          <group key={`t${i}`} position={[t.x, 0, t.z]} rotation={[0, t.ry, 0]} scale={0.85 + (t.k % 40) / 100}>
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

"use client";

import { Clone, useGLTF } from "@react-three/drei";
import type { ModelSpec } from "@/config/assets";
import { Procedural } from "./Procedural";

/** Renders a ModelSpec: a cloned glb (shared geometry/materials) or a procedural placeholder. */
export function Model({ spec, castShadow = true }: { spec: ModelSpec; castShadow?: boolean }) {
  const s = spec.scale ?? 1;
  const [ox, oy, oz] = spec.offset ?? [0, 0, 0];
  return (
    <group position={[ox, (spec.y ?? 0) + oy, oz]} rotation={[0, spec.rotY ?? 0, 0]} scale={s}>
      {"url" in spec ? <GlbModel url={spec.url} castShadow={castShadow} /> : <Procedural kind={spec.procedural} />}
    </group>
  );
}

function GlbModel({ url, castShadow }: { url: string; castShadow: boolean }) {
  const { scene } = useGLTF(url);
  return <Clone object={scene} castShadow={castShadow} receiveShadow />;
}

/** Stack of specs rendered together (crop stages can be composites). */
export function ModelStack({ specs, castShadow }: { specs: ModelSpec[]; castShadow?: boolean }) {
  return (
    <>
      {specs.map((spec, i) => (
        <Model key={i} spec={spec} castShadow={castShadow} />
      ))}
    </>
  );
}

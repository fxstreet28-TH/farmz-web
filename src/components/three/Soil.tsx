"use client";

// All plot soil blocks in two instanced draw calls (block + furrowed top), whatever the grid size.
import { Instance, Instances } from "@react-three/drei";

export function SoilTiles({ positions, highlight }: { positions: [number, number, number][]; highlight: Set<number> }) {
  return (
    <group>
      <Instances limit={Math.max(positions.length, 1)} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.22, 1.2]} />
        <meshStandardMaterial color="#8a5d35" flatShading />
        {positions.map((p, i) => (
          <Instance key={i} position={[p[0], 0.11, p[2]]} color={highlight.has(i) ? "#b8864f" : "#8a5d35"} />
        ))}
      </Instances>
      {/* furrows: 3 ridges per plot */}
      <Instances limit={Math.max(positions.length * 3, 1)} receiveShadow>
        <boxGeometry args={[1.02, 0.06, 0.22]} />
        <meshStandardMaterial color="#6d4726" flatShading />
        {positions.flatMap((p, i) =>
          [-0.36, 0, 0.36].map((dz, k) => <Instance key={`${i}-${k}`} position={[p[0], 0.245, p[2] + dz]} />),
        )}
      </Instances>
    </group>
  );
}

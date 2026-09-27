"use client";

// Low-poly placeholders for art the CC0 kits don't cover yet. Each is a handful of primitives
// (< 300 tris). Replace via src/config/assets.ts once a real .glb exists.
import type { ProceduralKind } from "@/config/assets";

const flat = { flatShading: true } as const;

function Sheep() {
  return (
    <group>
      {/* fleece */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#f4f1ea" {...flat} />
      </mesh>
      <mesh castShadow position={[0.18, 0.58, 0.1]}>
        <icosahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial color="#fbf9f4" {...flat} />
      </mesh>
      <mesh castShadow position={[-0.2, 0.55, -0.08]}>
        <icosahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial color="#efebe2" {...flat} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 0.6, 0.38]}>
        <boxGeometry args={[0.24, 0.24, 0.22]} />
        <meshStandardMaterial color="#3b3330" {...flat} />
      </mesh>
      <mesh position={[0.08, 0.66, 0.5]}>
        <boxGeometry args={[0.04, 0.04, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.08, 0.66, 0.5]}>
        <boxGeometry args={[0.04, 0.04, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* legs */}
      {[[-0.16, 0.14], [0.16, 0.14], [-0.16, -0.16], [0.16, -0.16]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.12, z]}>
          <boxGeometry args={[0.09, 0.24, 0.09]} />
          <meshStandardMaterial color="#3b3330" {...flat} />
        </mesh>
      ))}
    </group>
  );
}

function Barn() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 1, 0]}>
        <boxGeometry args={[3, 2, 2.4]} />
        <meshStandardMaterial color="#c0392b" {...flat} />
      </mesh>
      {/* roof: 3-sided cylinder = triangular prism, ridge up, running along x */}
      <group position={[0, 2.72, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.45, 1.45, 3.3, 3, 1]} />
          <meshStandardMaterial color="#6d4c41" {...flat} />
        </mesh>
      </group>
      {/* white trim + doors */}
      <mesh position={[0, 0.85, 1.21]}>
        <boxGeometry args={[1.3, 1.7, 0.04]} />
        <meshStandardMaterial color="#f5f0e6" {...flat} />
      </mesh>
      <mesh position={[0, 0.85, 1.235]}>
        <boxGeometry args={[1.1, 1.5, 0.04]} />
        <meshStandardMaterial color="#a93226" {...flat} />
      </mesh>
      <mesh position={[0, 0.85, 1.26]} rotation={[0, 0, Math.PI / 4.6]}>
        <boxGeometry args={[0.1, 1.8, 0.02]} />
        <meshStandardMaterial color="#f5f0e6" />
      </mesh>
      <mesh position={[0, 0.85, 1.26]} rotation={[0, 0, -Math.PI / 4.6]}>
        <boxGeometry args={[0.1, 1.8, 0.02]} />
        <meshStandardMaterial color="#f5f0e6" />
      </mesh>
      {/* hayloft window */}
      <mesh position={[0, 2.35, 1.2]}>
        <boxGeometry args={[0.6, 0.5, 0.05]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>
    </group>
  );
}

function Sprout() {
  return (
    <group>
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.4, 5]} />
        <meshStandardMaterial color="#5fae23" {...flat} />
      </mesh>
      <mesh castShadow position={[0.1, 0.38, 0]} rotation={[0, 0, -0.6]}>
        <sphereGeometry args={[0.1, 5, 3]} />
        <meshStandardMaterial color="#7cc93a" {...flat} />
      </mesh>
      <mesh castShadow position={[-0.1, 0.34, 0]} rotation={[0, 0, 0.6]}>
        <sphereGeometry args={[0.09, 5, 3]} />
        <meshStandardMaterial color="#7cc93a" {...flat} />
      </mesh>
    </group>
  );
}

function HayBale() {
  return (
    <mesh castShadow receiveShadow position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.3, 0.3, 0.6, 8]} />
      <meshStandardMaterial color="#e8c35a" {...flat} />
    </mesh>
  );
}

function Trough() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[1.2, 0.3, 0.45]} />
        <meshStandardMaterial color="#8a5d35" {...flat} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[1.05, 0.04, 0.32]} />
        <meshStandardMaterial color="#e8c35a" {...flat} />
      </mesh>
    </group>
  );
}

export function Procedural({ kind }: { kind: ProceduralKind }) {
  switch (kind) {
    case "sheep":
      return <Sheep />;
    case "barn":
      return <Barn />;
    case "sprout":
      return <Sprout />;
    case "haybale":
      return <HayBale />;
    case "trough":
      return <Trough />;
  }
}

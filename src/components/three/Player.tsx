"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import Ecctrl, { EcctrlAnimation, type CustomEcctrlRigidBody } from "ecctrl-lib";
import { useMemo, useRef } from "react";
import type { Object3D } from "three";
import { PLAYER_MODEL } from "@/config/assets";
import { player } from "@/lib/interaction";
import { SPAWN } from "./layout";

function CharacterModel() {
  const { scene } = useGLTF(PLAYER_MODEL.url);
  // Single instance: use the loaded scene directly (skinned meshes don't survive a naive clone).
  useMemo(() => {
    scene.traverse((o: Object3D) => {
      o.castShadow = true;
    });
  }, [scene]);
  return <primitive object={scene} position={[0, PLAYER_MODEL.y, 0]} scale={PLAYER_MODEL.scale} />;
}

/**
 * Floating-capsule character (ecctrl on rapier) with a third-person follow camera.
 * Movement comes from drei KeyboardControls (WASD/arrows, Shift run, Space jump) or the mobile
 * joystick; the camera orbits with mouse drag / touch drag and zooms with the wheel.
 */
export function Player({ disabled, lowQuality }: { disabled: boolean; lowQuality: boolean }) {
  const body = useRef<CustomEcctrlRigidBody>(null);

  useFrame(() => {
    const rb = body.current;
    if (!rb) return;
    const t = rb.translation();
    player.x = t.x;
    player.z = t.z;
    // Respawn if something ever pushes the player off the map.
    if (t.y < -5) {
      rb.setTranslation({ x: SPAWN[0], y: SPAWN[1], z: SPAWN[2] }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  });

  return (
    <group>
      <Ecctrl
        ref={body}
        position={SPAWN}
        animated
        characterInitDir={Math.PI} // face north, away from the camera, on spawn
        followLight={!lowQuality}
        followLightPos={{ x: 8, y: 14, z: 6 }}
        disableControl={disabled}
        capsuleHalfHeight={0.35}
        capsuleRadius={0.3}
        floatHeight={0.3}
        maxVelLimit={3.4}
        sprintMult={1.7}
        jumpVel={4}
        turnSpeed={12}
        camInitDis={-7}
        camMaxDis={-11}
        camMinDis={-3.5}
        camInitDir={{ x: 0.45, y: Math.PI }}
        camUpLimit={1.1}
        camLowLimit={-0.1}
        camTargetPos={{ x: 0, y: 0.4, z: 0 }}
        camMoveSpeed={1.2}
        camZoomSpeed={1}
        camCollision
        camListenerTarget="domElement"
        // Locked upright capsule; only the visual model turns. The auto-balance torque spring is
        // unstable at uneven frame rates (it blew up to NaN on slow devices in testing).
        autoBalance={false}
      >
        <EcctrlAnimation characterURL={PLAYER_MODEL.url} animationSet={PLAYER_MODEL.animations}>
          <CharacterModel />
        </EcctrlAnimation>
      </Ecctrl>
      {/* ecctrl moves the light named "followLight" (a sibling of the controller) with the player,
          so a small, sharp shadow frustum follows wherever you walk. */}
      <directionalLight
        name="followLight"
        intensity={1.8}
        color="#fff1d6"
        castShadow={!lowQuality}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0005}
        position={[8, 14, 6]}
      />
    </group>
  );
}

"use client";

import {
  AdaptiveDpr,
  Html,
  OrbitControls,
  PerformanceMonitor,
  Sky,
  useGLTF,
  useProgress,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { allModelUrls } from "@/config/assets";
import { useFarmActions, animalStatus, cropStage } from "@/lib/farmActions";
import { emoji } from "@/lib/emoji";
import { useConfig, useTick } from "@/lib/game";
import type { Animal, GameState, Plot } from "@/lib/types";
import { useToast } from "../Toast";
import { Animal3D } from "./Animal3D";
import { Plot3D, type HarvestFx } from "./Plot3D";
import { Scenery } from "./Scenery";
import { SoilTiles } from "./Soil";
import { CameraRig } from "./CameraRig";
import { CAMERA_TARGET, plotPosition } from "./layout";

// Kick off model downloads as soon as this chunk loads (the scene itself is lazy-loaded).
if (typeof window !== "undefined") allModelUrls().forEach((u) => useGLTF.preload(u));

function detectLowEnd() {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const small = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency ?? 8;
  return (coarse && small) || cores <= 4;
}

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 font-display font-extrabold text-grass-800">
        <span className="animate-sway text-4xl">🌱</span>
        <span className="whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-sm shadow-chunky-sm">
          Loading farm… {Math.round(progress)}%
        </span>
      </div>
    </Html>
  );
}

function World({
  state,
  lowQuality,
  onEmptyPlot,
  onNeedFeed,
}: {
  state: GameState;
  lowQuality: boolean;
  onEmptyPlot: (plot: Plot) => void;
  onNeedFeed: (animal: Animal) => void;
}) {
  const now = useTick(1000);
  const { harvest, feed, collect, busy } = useFarmActions();
  const { data: config } = useConfig();
  const toast = useToast();
  const [hovered, setHovered] = useState<string | null>(null);
  const [harvestFx, setHarvestFx] = useState<Record<string, HarvestFx>>({});
  const [animalFx, setAnimalFx] = useState<Record<string, string>>({});

  const positions = useMemo(() => state.plots.map((_, i) => plotPosition(i, state.plots.length)), [state.plots]);
  const highlight = useMemo(() => {
    const s = new Set<number>();
    state.plots.forEach((p, i) => p.id === hovered && s.add(i));
    return s;
  }, [state.plots, hovered]);

  const flashPlot = (id: string, fx: HarvestFx) => {
    setHarvestFx((m) => ({ ...m, [id]: fx }));
    setTimeout(() => setHarvestFx((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    }), 1300);
  };
  const flashAnimal = (id: string, label: string) => {
    setAnimalFx((m) => ({ ...m, [id]: label }));
    setTimeout(() => setAnimalFx((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    }), 1200);
  };

  const selectPlot = useCallback(
    async (plot: Plot) => {
      if (plot.state === "empty") return onEmptyPlot(plot);
      // Growing or ready: always ask the server. It answers NOT_READY if the timer isn't done.
      const cropId = plot.crop_id ?? "";
      const r = await harvest(plot);
      if (r) flashPlot(plot.id, { cropId, label: `+${r.qty} ${emoji(r.item)}`, at: Date.now() });
    },
    [harvest, onEmptyPlot],
  );

  const inv = useMemo(() => Object.fromEntries(state.inventory.map((i) => [i.item, i.qty])), [state.inventory]);

  const selectAnimal = useCallback(
    async (a: Animal) => {
      const { status } = animalStatus(a, Date.now());
      if (status === "hungry") {
        const feedItem = config?.animals[a.type]?.feedItem;
        if (feedItem && (inv[feedItem] ?? 0) < (config?.animals[a.type]?.feedQty ?? 1)) {
          toast(`Need ${emoji(feedItem)} ${config?.shop[feedItem]?.name ?? "feed"} — grab some at the market`, "info");
          return onNeedFeed(a);
        }
        const r = await feed(a);
        if (r) flashAnimal(a.id, "😋");
      } else {
        const r = await collect(a);
        if (r) flashAnimal(a.id, `+${r.qty} ${emoji(r.item)}`);
      }
    },
    [collect, config, feed, inv, onNeedFeed, toast],
  );

  return (
    <>
      <SoilTiles positions={positions} highlight={highlight} />
      {state.plots.map((plot, i) => (
        <Plot3D
          key={plot.id}
          plot={plot}
          position={positions[i]}
          now={now}
          busy={!!busy[`plot:${plot.id}`]}
          fx={harvestFx[plot.id] ?? null}
          hovered={hovered === plot.id}
          onHover={(h) => setHovered((cur) => (h ? plot.id : cur === plot.id ? null : cur))}
          onSelect={selectPlot}
          lowQuality={lowQuality}
        />
      ))}
      {state.animals.map((a, i) => (
        <Animal3D
          key={a.id}
          animal={a}
          index={i}
          now={now}
          busy={!!busy[`animal:${a.id}`]}
          label={animalFx[a.id] ?? null}
          produce={config?.animals[a.type]?.produce}
          onSelect={selectAnimal}
        />
      ))}
    </>
  );
}

export default function FarmScene({
  state,
  onEmptyPlot,
  onNeedFeed,
}: {
  state: GameState;
  onEmptyPlot: (plot: Plot) => void;
  onNeedFeed: (animal: Animal) => void;
}) {
  const [lowQuality, setLowQuality] = useState(false);
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  // Desktop has a 400px HUD panel on the right: aim the camera right of the farm so it stays visible.
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (detectLowEnd()) {
      setLowQuality(true);
      setDpr([1, 1.5]);
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setWide(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const target = useMemo<[number, number, number]>(
    () => (wide ? [CAMERA_TARGET[0] + 2.6, 0, CAMERA_TARGET[2]] : CAMERA_TARGET),
    [wide],
  );

  const readyCount = state.plots.filter((p) => cropStage(p, Date.now()).stage === 2 && p.state !== "empty").length;

  return (
    <Canvas
      flat
      shadows={!lowQuality}
      dpr={dpr}
      camera={{ position: [0.4, 12, 15], fov: 40, near: 0.5, far: 120 }}
      gl={{ antialias: !lowQuality, powerPreference: "high-performance" }}
      onPointerMissed={() => document.body.style.removeProperty("cursor")}
      aria-label={`Farm scene: ${state.plots.length} plots, ${readyCount} ready, ${state.animals.length} animals`}
    >
      {/* Drop quality automatically when the frame rate can't keep up. */}
      <PerformanceMonitor
        onDecline={() => {
          setLowQuality(true);
          setDpr([1, 1]);
        }}
        flipflops={2}
      />
      <AdaptiveDpr pixelated={false} />

      <color attach="background" args={["#bfe6ff"]} />
      <fog attach="fog" args={["#cdebf7", 24, 60]} />
      <Sky sunPosition={[8, 6, 6]} turbidity={4} rayleigh={1.2} mieCoefficient={0.004} />

      <hemisphereLight args={["#fff6dc", "#7aa04a", 1.1]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.8}
        color="#fff1d6"
        castShadow={!lowQuality}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0005}
      />

      <Suspense fallback={<LoadingOverlay />}>
        <Scenery lowQuality={lowQuality} />
        <World state={state} lowQuality={lowQuality} onEmptyPlot={onEmptyPlot} onNeedFeed={onNeedFeed} />
      </Suspense>

      <OrbitControls
        makeDefault
        target={target}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={7}
        maxDistance={32}
        minPolarAngle={0.5}
        maxPolarAngle={1.12}
        minAzimuthAngle={-1}
        maxAzimuthAngle={1}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
      <CameraRig target={target} />
    </Canvas>
  );
}

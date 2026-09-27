"use client";

import {
  AdaptiveDpr,
  Html,
  KeyboardControls,
  PerformanceMonitor,
  Sky,
  useGLTF,
  useKeyboardControls,
  useProgress,
  type KeyboardControlsEntry,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { EcctrlJoystick } from "ecctrl-lib";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MeshBasicMaterial } from "three";
import { allModelUrls } from "@/config/assets";
import { useFarmActions } from "@/lib/farmActions";
import { emoji } from "@/lib/emoji";
import { useConfig, useTick } from "@/lib/game";
import { resolveFocus, triggerFocus, useInteractable, useInteraction } from "@/lib/interaction";
import type { Animal, GameState, Plot } from "@/lib/types";
import { useToast } from "../Toast";
import { Animal3D } from "./Animal3D";
import { Player } from "./Player";
import { Plot3D, type HarvestFx } from "./Plot3D";
import { Scenery } from "./Scenery";
import { SoilTiles } from "./Soil";
import { BOARD_POS, MARKET_POS, plotPosition } from "./layout";

export type PanelTab = "missions" | "shop" | "wallet" | "barn";

// Kick off model downloads as soon as this chunk loads (the scene itself is lazy-loaded).
if (typeof window !== "undefined") allModelUrls().forEach((u) => useGLTF.preload(u));

const KEYMAP: KeyboardControlsEntry<string>[] = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["Shift"] },
  { name: "action1", keys: ["KeyE", "Enter"] }, // interact (also plays the "pick-up" animation)
];

// Farm-coloured joystick (ecctrl defaults to a rainbow normal material). Unlit: the joystick
// renders in its own little canvas without scene lights.
const joyMaterials = {
  base: new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.45 }),
  stick: new MeshBasicMaterial({ color: "#a97a4b" }),
  handle: new MeshBasicMaterial({ color: "#ffcc22" }),
};

export function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

function detectLowEnd() {
  if (typeof window === "undefined") return false;
  const small = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency ?? 8;
  return (isTouchDevice() && small) || cores <= 4;
}

function LoadingOverlay() {
  const { progress } = useProgress();
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

/** Re-evaluates the nearest interactable ~10×/s. */
function FocusResolver() {
  const acc = useRef(0);
  useFrame((state, dt) => {
    if (process.env.NODE_ENV !== "production") {
      const w = window as unknown as { __farmz?: Record<string, unknown> };
      if (w.__farmz) w.__farmz.camera = state.camera;
    }
    acc.current += dt;
    if (acc.current < 0.1) return;
    acc.current = 0;
    resolveFocus();
  });
  useEffect(() => () => useInteraction.getState().setFocus(null, null), []);
  return null;
}

/** E / Enter triggers the focused object's action. */
function InteractKey() {
  const [subscribe] = useKeyboardControls();
  useEffect(
    () =>
      subscribe(
        (s) => s.action1,
        (pressed) => {
          if (pressed) triggerFocus();
        },
      ),
    [subscribe],
  );
  return null;
}

function Stations({ onOpenPanel }: { onOpenPanel: (t: PanelTab) => void }) {
  useInteractable("station:market", {
    pos: () => [MARKET_POS[0] - 1.3, MARKET_POS[2] + 0.2],
    radius: 3,
    prompt: () => ({ icon: "🛒", label: "Open Market", actionable: true }),
    act: () => onOpenPanel("shop"),
  });
  useInteractable("station:board", {
    pos: () => [BOARD_POS[0], BOARD_POS[2]],
    radius: 2.4,
    prompt: () => ({ icon: "📋", label: "Daily Missions & Orders", actionable: true }),
    act: () => onOpenPanel("missions"),
  });
  return null;
}

function World({
  state,
  lowQuality,
  onEmptyPlot,
  onOpenPanel,
}: {
  state: GameState;
  lowQuality: boolean;
  onEmptyPlot: (plot: Plot) => void;
  onOpenPanel: (t: PanelTab) => void;
}) {
  const now = useTick(1000);
  const { harvest, feed, collect, busy } = useFarmActions();
  const { data: config } = useConfig();
  const toast = useToast();
  const [harvestFx, setHarvestFx] = useState<Record<string, HarvestFx>>({});
  const [animalFx, setAnimalFx] = useState<Record<string, string>>({});

  const positions = useMemo(() => state.plots.map((_, i) => plotPosition(i, state.plots.length)), [state.plots]);
  const noHighlight = useMemo(() => new Set<number>(), []);
  const inv = useMemo(() => Object.fromEntries(state.inventory.map((i) => [i.item, i.qty])), [state.inventory]);

  const flash = <T,>(set: React.Dispatch<React.SetStateAction<Record<string, T>>>, id: string, v: T, ms: number) => {
    set((m) => ({ ...m, [id]: v }));
    setTimeout(() => set((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    }), ms);
  };

  const onHarvest = useCallback(
    async (plot: Plot) => {
      const cropId = plot.crop_id ?? "";
      const r = await harvest(plot);
      if (r) flash(setHarvestFx, plot.id, { cropId, label: `+${r.qty} ${emoji(r.item)}`, at: Date.now() }, 1300);
    },
    [harvest],
  );

  const hasFeedFor = (type: string) => {
    const a = config?.animals[type];
    return !!a && (inv[a.feedItem] ?? 0) >= a.feedQty;
  };

  const onFeed = useCallback(
    async (a: Animal) => {
      const cfg = config?.animals[a.type];
      if (cfg && (inv[cfg.feedItem] ?? 0) < cfg.feedQty) {
        toast(`Need ${emoji(cfg.feedItem)} ${config?.shop[cfg.feedItem]?.name ?? "feed"} — opening the market`, "info");
        return onOpenPanel("shop");
      }
      const r = await feed(a);
      if (r) flash<string>(setAnimalFx, a.id, "😋", 1200);
    },
    [config, feed, inv, onOpenPanel, toast],
  );

  const onCollect = useCallback(
    async (a: Animal) => {
      const r = await collect(a);
      if (r) flash(setAnimalFx, a.id, `+${r.qty} ${emoji(r.item)}`, 1200);
    },
    [collect],
  );

  return (
    <>
      <SoilTiles positions={positions} highlight={noHighlight} />
      {state.plots.map((plot, i) => (
        <Plot3D
          key={plot.id}
          plot={plot}
          position={positions[i]}
          now={now}
          busy={!!busy[`plot:${plot.id}`]}
          fx={harvestFx[plot.id] ?? null}
          cropName={plot.crop_id ? config?.crops[plot.crop_id]?.name : undefined}
          onPlant={onEmptyPlot}
          onHarvest={onHarvest}
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
          name={config?.animals[a.type]?.name ?? a.type}
          hasFeed={hasFeedFor(a.type)}
          onFeed={onFeed}
          onCollect={onCollect}
        />
      ))}
      <Stations onOpenPanel={onOpenPanel} />
    </>
  );
}

export default function FarmScene({
  state,
  uiOpen,
  onEmptyPlot,
  onOpenPanel,
}: {
  state: GameState;
  uiOpen: boolean;
  onEmptyPlot: (plot: Plot) => void;
  onOpenPanel: (t: PanelTab) => void;
}) {
  const [lowQuality, setLowQuality] = useState(false);
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(isTouchDevice());
    if (detectLowEnd()) {
      setLowQuality(true);
      setDpr([1, 1.5]);
    }
  }, []);

  useEffect(() => {
    useInteraction.getState().setUiOpen(uiOpen);
  }, [uiOpen]);

  return (
    <KeyboardControls map={KEYMAP}>
      <InteractKey />
      <Canvas
        flat
        shadows={!lowQuality}
        dpr={dpr}
        camera={{ fov: 50, near: 0.2, far: 140, position: [0, 6, 14] }}
        gl={{ antialias: !lowQuality, powerPreference: "high-performance" }}
        style={{ touchAction: "none" }}
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
        <fog attach="fog" args={["#cdebf7", 30, 75]} />
        <Sky sunPosition={[8, 6, 6]} turbidity={4} rayleigh={1.2} mieCoefficient={0.004} />
        <hemisphereLight args={["#fff6dc", "#7aa04a", 1.1]} />
        <ambientLight intensity={0.25} />

        <Suspense fallback={<LoadingOverlay />}>
          {/* Fixed 60 Hz physics step, independent of render frame rate. */}
          <Physics timeStep={1 / 60} gravity={[0, -9.81, 0]}>
            <Scenery lowQuality={lowQuality} plotCount={state.plots.length} />
            <World state={state} lowQuality={lowQuality} onEmptyPlot={onEmptyPlot} onOpenPanel={onOpenPanel} />
            <Player disabled={uiOpen} lowQuality={lowQuality} />
          </Physics>
          <FocusResolver />
        </Suspense>
      </Canvas>
      {touch && !uiOpen && (
        <EcctrlJoystick
          buttonNumber={0}
          joystickPositionLeft={8}
          joystickPositionBottom={78}
          joystickHeightAndWidth={150}
          joystickBaseProps={{ material: joyMaterials.base }}
          joystickStickProps={{ material: joyMaterials.stick }}
          joystickHandleProps={{ material: joyMaterials.handle }}
        />
      )}
    </KeyboardControls>
  );
}

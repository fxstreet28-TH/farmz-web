"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";
import { ClaimPanel } from "@/components/ClaimPanel";
import { CropPicker } from "@/components/CropPicker";
import { Header } from "@/components/Header";
import { ActionPrompt } from "@/components/hud/ActionPrompt";
import { Minimap } from "@/components/hud/Minimap";
import { Inventory } from "@/components/Inventory";
import { Missions } from "@/components/Missions";
import { Orders } from "@/components/Orders";
import { Shop } from "@/components/Shop";
import type { PanelTab } from "@/components/three/FarmScene";
import { friendlyError } from "@/lib/api";
import { cropStage, useFarmActions } from "@/lib/farmActions";
import { useGameState } from "@/lib/game";
import { useSession } from "@/lib/session";
import type { GameState, Plot } from "@/lib/types";

// three.js / rapier only run in the browser; load the world lazily so the HUD paints first.
const FarmScene = dynamic(() => import("@/components/three/FarmScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-display text-lg font-bold text-grass-700">
      <span className="mr-2 animate-sway text-4xl">🌱</span> Loading 3D farm…
    </div>
  ),
});

const TABS: { id: PanelTab; icon: string; label: string }[] = [
  { id: "missions", icon: "📋", label: "Missions" },
  { id: "shop", icon: "🛒", label: "Market" },
  { id: "wallet", icon: "👛", label: "Wallet" },
  { id: "barn", icon: "🧺", label: "Barn" },
];

function TabContent({ tab, state }: { tab: PanelTab; state: GameState }) {
  switch (tab) {
    case "missions":
      return (
        <>
          <Missions state={state} />
          <Orders state={state} />
        </>
      );
    case "shop":
      return <Shop state={state} />;
    case "wallet":
      return <ClaimPanel state={state} />;
    case "barn":
      return <Inventory state={state} />;
  }
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => setTouch(window.matchMedia?.("(pointer: coarse)").matches ?? false), []);
  return touch;
}

function Game() {
  const { data: state, isLoading, error, refetch } = useGameState();
  const { plant } = useFarmActions();
  const desktop = useIsDesktop();
  const touch = useIsTouch();
  const [panel, setPanel] = useState<PanelTab | null>(null);
  const [picking, setPicking] = useState<Plot | null>(null);

  const openPanel = useCallback((t: PanelTab) => setPanel(t), []);
  // On phones a panel covers the joystick, so movement pauses while it's open.
  const uiOpen = !!picking || (!desktop && !!panel);

  if (isLoading) {
    return (
      <div className="mt-16 flex flex-col items-center gap-2 font-display text-lg font-bold text-grass-700">
        <span className="animate-sway text-5xl">🌱</span>
        Loading your farm…
      </div>
    );
  }
  if (error || !state) {
    return (
      <div className="mx-auto mt-8 max-w-md px-4">
        <div className="card text-center">
          <p className="text-4xl">🥀</p>
          <p className="font-display text-lg font-extrabold">Couldn&apos;t load your farm</p>
          <p className="text-sm text-grass-800/70">{friendlyError(error)}</p>
          <button className="btn-green mt-3" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const openMissions = state.missions.filter((m) => !m.completed).length;
  const readyCount = state.plots.filter((p) => p.state !== "empty" && cropStage(p, Date.now()).stage === 2).length;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0">
        <FarmScene state={state} uiOpen={uiOpen} onEmptyPlot={setPicking} onOpenPanel={openPanel} />
      </div>

      {/* top-left: minimap */}
      <div className="absolute left-3 top-3 z-20 scale-[0.8] origin-top-left sm:scale-100">
        <Minimap plotCount={state.plots.length} readyCount={readyCount} />
      </div>

      {/* top-right: menu */}
      <div className={`absolute top-3 z-30 flex flex-col gap-2 transition-[right] ${desktop && panel ? "right-[420px]" : "right-3"}`}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setPanel((cur) => (cur === t.id ? null : t.id))}
            className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-white text-2xl shadow-chunky transition active:translate-y-0.5 sm:h-14 sm:w-14 ${
              panel === t.id ? "bg-sun-400" : "bg-white/90 hover:bg-sun-100"
            }`}
            aria-label={t.label}
            title={t.label}
          >
            {t.icon}
            {t.id === "missions" && openMissions > 0 && (
              <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white">{openMissions}</span>
            )}
          </button>
        ))}
      </div>

      {/* desktop: control hints */}
      {!touch && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden rounded-2xl bg-white/80 px-3 py-2 text-[11px] font-bold leading-5 text-grass-800 shadow-chunky-sm backdrop-blur sm:block">
          <b>WASD</b> move · <b>Shift</b> run · <b>Space</b> jump
          <br />
          <b>E</b> interact · <b>drag</b> look · <b>wheel</b> zoom
        </div>
      )}

      <ActionPrompt touch={touch} />

      {/* panel: side sheet on desktop, bottom sheet on phones */}
      {panel && (
        <aside
          className={
            desktop
              ? "absolute bottom-3 right-3 top-3 z-30 flex w-[400px] flex-col overflow-hidden rounded-3xl border-4 border-white/80 bg-grass-50/90 shadow-chunky backdrop-blur"
              : "absolute inset-x-0 bottom-0 z-40 flex max-h-[72%] flex-col overflow-hidden rounded-t-3xl border-4 border-b-0 border-white bg-grass-50/95 shadow-chunky backdrop-blur"
          }
        >
          <div className="flex items-center gap-1 border-b-4 border-white/80 bg-grass-100/80 p-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setPanel(t.id)}
                className={`flex flex-1 flex-col items-center rounded-2xl py-1 font-display text-[11px] font-extrabold transition ${
                  panel === t.id ? "bg-white text-grass-600 shadow-chunky-sm" : "text-grass-800/60"
                }`}
              >
                <span className="text-lg">{t.icon}</span>
                {t.label}
              </button>
            ))}
            <button className="btn-ghost ml-1 h-9 w-9 shrink-0 p-0 text-sm" onClick={() => setPanel(null)} aria-label="Close panel">
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto p-3 pb-[max(env(safe-area-inset-bottom),12px)]">
            <TabContent tab={panel} state={state} />
          </div>
        </aside>
      )}

      <CropPicker
        plot={picking}
        state={state}
        onClose={() => setPicking(null)}
        onPick={(plot, cropId) => {
          setPicking(null);
          plant(plot, cropId);
        }}
      />
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 flex flex-col">{children}</div>;
}

export default function Home() {
  const { status } = useSession();
  return status === "signed-in" ? (
    <Shell>
      <Header />
      <Game />
    </Shell>
  ) : (
    <>
      <Header />
      <AuthGate />
    </>
  );
}

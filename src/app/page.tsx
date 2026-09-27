"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";
import { ClaimPanel } from "@/components/ClaimPanel";
import { CropPicker } from "@/components/CropPicker";
import { Header } from "@/components/Header";
import { Inventory } from "@/components/Inventory";
import { Missions } from "@/components/Missions";
import { Orders } from "@/components/Orders";
import { Shop } from "@/components/Shop";
import { friendlyError } from "@/lib/api";
import { useFarmActions } from "@/lib/farmActions";
import { useGameState } from "@/lib/game";
import { useSession } from "@/lib/session";
import type { GameState, Plot } from "@/lib/types";

// three.js only runs in the browser; load the scene lazily so the HUD paints first.
const FarmScene = dynamic(() => import("@/components/three/FarmScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-display text-lg font-bold text-grass-700">
      <span className="mr-2 animate-sway text-4xl">🌱</span> Loading 3D farm…
    </div>
  ),
});

type Tab = "missions" | "shop" | "wallet" | "barn";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "missions", icon: "📋", label: "Missions" },
  { id: "shop", icon: "🛒", label: "Market" },
  { id: "wallet", icon: "👛", label: "Wallet" },
  { id: "barn", icon: "🧺", label: "Barn" },
];

function TabContent({ tab, state }: { tab: Tab; state: GameState }) {
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

function TabButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: string; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 flex-col items-center rounded-2xl py-1.5 font-display text-xs font-extrabold transition ${
        active ? "bg-white text-grass-600 shadow-chunky-sm" : "text-grass-800/60 hover:text-grass-700"
      }`}
    >
      <span className={`text-xl transition ${active ? "scale-110" : ""}`}>{icon}</span>
      {label}
      {!!badge && (
        <span className="absolute right-2 top-0.5 min-w-[18px] rounded-full bg-rose-500 px-1 text-[10px] leading-[18px] text-white">{badge}</span>
      )}
    </button>
  );
}

function Game() {
  const { data: state, isLoading, error, refetch } = useGameState();
  const { plant } = useFarmActions();
  const [desktopTab, setDesktopTab] = useState<Tab>("missions");
  const [mobileTab, setMobileTab] = useState<Tab | null>(null);
  const [picking, setPicking] = useState<Plot | null>(null);

  const openShop = useCallback(() => {
    setDesktopTab("shop");
    setMobileTab("shop");
  }, []);

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
  const badge = (t: Tab) => (t === "missions" ? openMissions : 0);

  return (
    <div className="relative min-h-0 flex-1">
      {/* 3D world fills the screen under the HUD */}
      <div className="absolute inset-0">
        <FarmScene state={state} onEmptyPlot={setPicking} onNeedFeed={openShop} />
      </div>

      {/* hint */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-grass-800 shadow-chunky-sm backdrop-blur">
        Tap a plot or animal · drag to look around
      </div>

      {/* Desktop: side panel */}
      <aside className="absolute bottom-3 right-3 top-3 hidden w-[400px] flex-col overflow-hidden rounded-3xl border-4 border-white/80 bg-grass-50/85 shadow-chunky backdrop-blur lg:flex">
        <div className="flex gap-1 border-b-4 border-white/80 bg-grass-100/80 p-1.5">
          {TABS.map((t) => (
            <TabButton key={t.id} active={desktopTab === t.id} onClick={() => setDesktopTab(t.id)} icon={t.icon} label={t.label} badge={badge(t.id)} />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
          <TabContent tab={desktopTab} state={state} />
        </div>
      </aside>

      {/* Mobile: bottom sheet for the selected tab + tab bar */}
      {mobileTab && (
        <div className="absolute inset-x-0 bottom-[68px] z-30 flex max-h-[62%] flex-col overflow-hidden rounded-t-3xl border-4 border-b-0 border-white bg-grass-50/95 shadow-chunky backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 pt-2">
            <span className="mx-auto h-1.5 w-12 rounded-full bg-grass-300" />
          </div>
          <button className="btn-ghost absolute right-2 top-2 h-8 w-8 p-0 text-sm" onClick={() => setMobileTab(null)} aria-label="Close panel">
            ✕
          </button>
          <div className="flex flex-col gap-3 overflow-y-auto p-3 pt-2">
            <TabContent tab={mobileTab} state={state} />
          </div>
        </div>
      )}
      <nav className="absolute inset-x-0 bottom-0 z-40 border-t-4 border-grass-400/60 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md gap-1">
          <TabButton active={mobileTab === null} onClick={() => setMobileTab(null)} icon="🌾" label="Farm" />
          {TABS.map((t) => (
            <TabButton
              key={t.id}
              active={mobileTab === t.id}
              onClick={() => setMobileTab((cur) => (cur === t.id ? null : t.id))}
              icon={t.icon}
              label={t.label}
              badge={badge(t.id)}
            />
          ))}
        </div>
      </nav>

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

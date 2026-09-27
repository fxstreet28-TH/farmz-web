"use client";

import { useState, type ReactNode } from "react";
import { Animals } from "@/components/Animals";
import { AuthGate } from "@/components/AuthGate";
import { ClaimPanel } from "@/components/ClaimPanel";
import { FarmGrid } from "@/components/FarmGrid";
import { Header } from "@/components/Header";
import { Inventory } from "@/components/Inventory";
import { Missions } from "@/components/Missions";
import { Orders } from "@/components/Orders";
import { Shop } from "@/components/Shop";
import { friendlyError } from "@/lib/api";
import { useGameState } from "@/lib/game";
import { useSession } from "@/lib/session";

type Tab = "farm" | "missions" | "shop" | "wallet";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "farm", icon: "🌾", label: "Farm" },
  { id: "missions", icon: "📋", label: "Missions" },
  { id: "shop", icon: "🛒", label: "Market" },
  { id: "wallet", icon: "👛", label: "Wallet" },
];

/** On mobile only the active tab's panels show; on desktop everything is laid out at once. */
function Panel({ tab, active, children }: { tab: Tab; active: Tab; children: ReactNode }) {
  return <div className={`${tab === active ? "flex" : "hidden"} flex-col gap-4 lg:flex`}>{children}</div>;
}

function Game() {
  const { data: state, isLoading, error, refetch } = useGameState();
  const [tab, setTab] = useState<Tab>("farm");

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

  const readyCount = state.plots.filter((p) => p.state === "ready").length;
  const openMissions = state.missions.filter((m) => !m.completed).length;

  return (
    <>
      <main className="mx-auto grid max-w-6xl gap-4 px-3 pb-28 pt-4 lg:grid-cols-[1.25fr_1fr] lg:pb-10">
        <div className="flex flex-col gap-4">
          <Panel tab="farm" active={tab}>
            <FarmGrid state={state} />
            <Animals state={state} onShop={() => setTab("shop")} />
            <Inventory state={state} />
          </Panel>
          <Panel tab="shop" active={tab}>
            <Shop state={state} />
          </Panel>
        </div>
        <div className="flex flex-col gap-4">
          <Panel tab="wallet" active={tab}>
            <ClaimPanel state={state} />
          </Panel>
          <Panel tab="missions" active={tab}>
            <Missions state={state} />
            <Orders state={state} />
          </Panel>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-grass-400/60 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map((t) => {
            const badge = t.id === "farm" ? readyCount : t.id === "missions" ? openMissions : 0;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`relative flex flex-col items-center py-2 font-display text-xs font-extrabold transition ${
                  tab === t.id ? "text-grass-600" : "text-grass-800/50"
                }`}
              >
                <span className={`text-2xl transition ${tab === t.id ? "scale-110" : "grayscale-[40%]"}`}>{t.icon}</span>
                {t.label}
                {badge > 0 && (
                  <span className="absolute right-[22%] top-1 min-w-[18px] rounded-full bg-rose-500 px-1 text-[10px] leading-[18px] text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default function Home() {
  const { status } = useSession();
  return (
    <>
      <Header />
      {status === "signed-in" ? <Game /> : <AuthGate />}
    </>
  );
}

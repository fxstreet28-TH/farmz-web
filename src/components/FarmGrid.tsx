"use client";

import { useState } from "react";
import { formatDuration, useAction, useConfig, useTick } from "@/lib/game";
import { emoji } from "@/lib/emoji";
import type { GameState, Plot } from "@/lib/types";
import { Sheet } from "./Sheet";

function growthStage(pct: number) {
  if (pct < 0.34) return "🌱";
  if (pct < 0.67) return "🌿";
  return null; // near done: show the crop itself, smaller
}

function PlotTile({ plot, now, onEmpty, onHarvest, busy, floater }: {
  plot: Plot;
  now: number;
  onEmpty: () => void;
  onHarvest: () => void;
  busy: boolean;
  floater: string | null;
}) {
  const readyAt = plot.ready_at ? Date.parse(plot.ready_at) : 0;
  const plantedAt = plot.planted_at ? Date.parse(plot.planted_at) : 0;
  const remaining = readyAt - now;
  const looksReady = plot.state === "ready" || (plot.state === "growing" && remaining <= 0);
  const pct = plot.state === "growing" && readyAt > plantedAt ? Math.min(1, (now - plantedAt) / (readyAt - plantedAt)) : 1;

  let body;
  if (plot.state === "empty") {
    body = (
      <>
        <span className="text-2xl opacity-40 transition group-hover:scale-110 group-hover:opacity-70">➕</span>
        <span className="absolute bottom-1.5 text-[11px] font-bold text-soil-300">Plant</span>
      </>
    );
  } else if (looksReady) {
    body = (
      <>
        <span className="animate-wiggle text-4xl drop-shadow sm:text-5xl">{emoji(plot.crop_id)}</span>
        <span className="chip absolute bottom-1.5 bg-sun-400 text-soil-600 shadow-chunky-sm">Harvest!</span>
      </>
    );
  } else {
    const stage = growthStage(pct);
    body = (
      <>
        <span key={stage ?? "crop"} className={`animate-pop ${stage ? "text-3xl sm:text-4xl" : "text-2xl opacity-80 sm:text-3xl"} animate-sway`}>
          {stage ?? emoji(plot.crop_id)}
        </span>
        <div className="absolute inset-x-2 bottom-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-soil-600/40">
            <div className="h-full rounded-full bg-grass-300 transition-[width] duration-1000" style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="mt-0.5 text-center text-[11px] font-bold tabular-nums text-white drop-shadow">{formatDuration(remaining)}</div>
        </div>
      </>
    );
  }

  return (
    <button
      className={`group relative flex aspect-square items-center justify-center rounded-2xl border-4 shadow-chunky transition active:translate-y-0.5 active:shadow-none ${
        looksReady ? "border-sun-300 bg-soil-400" : "border-soil-300/70 bg-soil-500"
      } ${busy ? "opacity-60" : ""}`}
      style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.07) 0 6px, transparent 6px 14px)" }}
      onClick={plot.state === "empty" ? onEmpty : onHarvest}
      disabled={busy}
      aria-label={plot.state === "empty" ? "Empty plot — plant a crop" : `${plot.crop_id} plot`}
    >
      {body}
      {floater && (
        <span className="pointer-events-none absolute top-1 animate-float-up font-display text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]">
          {floater}
        </span>
      )}
    </button>
  );
}

export function FarmGrid({ state }: { state: GameState }) {
  const now = useTick(1000);
  const { data: config } = useConfig();
  const { run, busy } = useAction();
  const [picking, setPicking] = useState<Plot | null>(null);
  const [floaters, setFloaters] = useState<Record<string, string>>({});

  const flash = (plotId: string, text: string) => {
    setFloaters((f) => ({ ...f, [plotId]: text }));
    setTimeout(() => setFloaters((f) => {
      const n = { ...f };
      delete n[plotId];
      return n;
    }), 1100);
  };

  const plant = async (plot: Plot, cropId: string) => {
    setPicking(null);
    const crop = config?.crops[cropId];
    await run<Plot>(`plot:${plot.id}`, "plant", { plotId: plot.id, cropId }, {
      patch: (s, r) => ({ ...s, plots: s.plots.map((p) => (p.id === r.id ? r : p)) }),
      success: () => `Planted ${crop?.name ?? cropId} ${emoji(cropId)}`,
    });
  };

  const harvest = async (plot: Plot) => {
    const r = await run<{ item: string; qty: number }>(`plot:${plot.id}`, "harvest", { plotId: plot.id }, {
      patch: (s) => ({
        ...s,
        plots: s.plots.map((p) => (p.id === plot.id ? { ...p, state: "empty", crop_id: null, planted_at: null, ready_at: null } : p)),
      }),
    });
    if (r) flash(plot.id, `+${r.qty} ${emoji(r.item)}`);
  };

  const cols = Math.max(3, Math.ceil(Math.sqrt(state.plots.length)));
  const level = state.player.level;
  const coins = Number(state.player.coin_balance);

  return (
    <section className="card">
      <h2 className="section-title">🌾 Fields</h2>
      <div className="mx-auto grid max-w-md gap-2.5 sm:gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {state.plots.map((plot) => (
          <PlotTile
            key={plot.id}
            plot={plot}
            now={now}
            busy={!!busy[`plot:${plot.id}`]}
            floater={floaters[plot.id] ?? null}
            onEmpty={() => setPicking(plot)}
            onHarvest={() => harvest(plot)}
          />
        ))}
      </div>
      {state.plots.length === 0 && <p className="text-center text-sm text-grass-800/70">No plots yet.</p>}

      <Sheet open={!!picking} onClose={() => setPicking(null)} title="🌱 What should we plant?">
        {!config ? (
          <p className="text-sm">Loading seeds…</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(config.crops).map(([id, c]) => {
              const locked = level < c.minLevel;
              const poor = coins < c.seedPrice;
              return (
                <button
                  key={id}
                  className="flex flex-col items-center rounded-2xl border-4 border-white bg-white p-3 shadow-chunky-sm transition hover:bg-sun-100 active:translate-y-0.5 disabled:opacity-50"
                  disabled={locked || poor}
                  onClick={() => picking && plant(picking, id)}
                >
                  <span className="text-4xl">{emoji(id)}</span>
                  <span className="font-display font-extrabold text-grass-800">{c.name}</span>
                  <span className="text-xs font-semibold text-grass-800/70">⏱ {formatDuration(c.growSeconds * 1000)} · ×{c.yield}</span>
                  <span className="mt-1 chip bg-sun-200 text-soil-600">
                    {locked ? `🔒 Lv ${c.minLevel}` : `🪙 ${c.seedPrice}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Sheet>
    </section>
  );
}

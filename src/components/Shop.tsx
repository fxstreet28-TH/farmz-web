"use client";

import { useState } from "react";
import { useAction, useConfig } from "@/lib/game";
import { emoji, titleCase } from "@/lib/emoji";
import type { GameState } from "@/lib/types";

function QtyStepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button className="btn-ghost h-8 w-8 p-0" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Less">
        −
      </button>
      <span className="w-8 text-center font-display font-extrabold tabular-nums">{value}</span>
      <button className="btn-ghost h-8 w-8 p-0" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="More">
        +
      </button>
    </div>
  );
}

export function Shop({ state }: { state: GameState }) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const { data: config } = useConfig();
  const { run, busy } = useAction();
  const [qty, setQty] = useState<Record<string, number>>({});

  if (!config) return <section className="card">Loading shop…</section>;

  const coins = Number(state.player.coin_balance);
  const level = state.player.level;
  const owned = (type: string) => state.animals.filter((a) => a.type === type).length;
  const q = (k: string) => qty[k] ?? 1;
  const setQ = (k: string, n: number) => setQty((s) => ({ ...s, [k]: n }));

  const buyables = [
    ...Object.entries(config.animals).map(([id, a]) => ({
      id, name: a.name, price: a.price, minLevel: a.minLevel,
      note: `Makes ${emoji(a.produce)} · owned ${owned(id)}/${a.maxOwned}`,
      max: Math.max(1, a.maxOwned - owned(id)),
      soldOut: owned(id) >= a.maxOwned,
    })),
    ...Object.entries(config.shop).map(([id, s]) => ({
      id, name: s.name, price: s.price, minLevel: s.minLevel,
      note: "Animal feed", max: 100, soldOut: false,
    })),
  ];

  const sellables = state.inventory.filter((i) => config.sellPrices[i.item]);

  return (
    <section className="card">
      <h2 className="section-title">🛒 Market</h2>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-grass-100 p-1">
        {(["buy", "sell"] as const).map((t) => (
          <button
            key={t}
            className={`rounded-xl py-1.5 font-display font-extrabold transition ${tab === t ? "bg-white text-grass-700 shadow-chunky-sm" : "text-grass-800/60"}`}
            onClick={() => setTab(t)}
          >
            {t === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      {tab === "buy" ? (
        <>
          <p className="mb-2 text-xs font-semibold text-grass-800/70">Seeds are bought automatically when you plant.</p>
          <ul className="flex flex-col gap-2">
            {buyables.map((b) => {
              const n = q(`buy:${b.id}`);
              const locked = level < b.minLevel;
              const total = b.price * n;
              return (
                <li key={b.id} className="flex items-center gap-3 rounded-2xl border-4 border-white bg-white p-2.5 shadow-chunky-sm">
                  <span className="text-4xl">{emoji(b.id)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-extrabold leading-tight text-grass-800">{b.name}</p>
                    <p className="text-xs font-semibold text-grass-800/70">{b.note}</p>
                    {!locked && !b.soldOut && <QtyStepper value={n} max={b.max} onChange={(v) => setQ(`buy:${b.id}`, v)} />}
                  </div>
                  <button
                    className="btn-yellow min-w-[84px] px-3 py-2 text-sm"
                    disabled={locked || b.soldOut || coins < total || !!busy[`buy:${b.id}`]}
                    onClick={() =>
                      run<{ item: string; qty: number; cost: number }>(`buy:${b.id}`, "buy", { item: b.id, qty: n }, {
                        success: (r) => `Bought ${r.qty}× ${emoji(r.item)} for ${r.cost} 🪙`,
                      }).then(() => setQ(`buy:${b.id}`, 1))
                    }
                  >
                    {locked ? `🔒 Lv ${b.minLevel}` : b.soldOut ? "Max" : `🪙 ${total}`}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : sellables.length === 0 ? (
        <p className="rounded-2xl bg-grass-100 p-3 text-center text-sm font-semibold text-grass-800">
          Nothing to sell yet — harvest crops or collect eggs first.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs font-semibold text-grass-800/70">Prices drop if you sell too often in a short time.</p>
          <ul className="flex flex-col gap-2">
            {sellables.map((i) => {
              const price = config.sellPrices[i.item];
              const n = Math.min(q(`sell:${i.item}`), i.qty);
              return (
                <li key={i.item} className="flex items-center gap-3 rounded-2xl border-4 border-white bg-white p-2.5 shadow-chunky-sm">
                  <span className="text-4xl">{emoji(i.item)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-extrabold leading-tight text-grass-800">
                      {config.crops[i.item]?.name ?? titleCase(i.item)} <span className="text-sm text-grass-800/60">×{i.qty}</span>
                    </p>
                    <p className="text-xs font-semibold text-grass-800/70">🪙 {price} each</p>
                    <div className="flex items-center gap-2">
                      <QtyStepper value={n} max={i.qty} onChange={(v) => setQ(`sell:${i.item}`, v)} />
                      <button className="text-xs font-bold text-sky-400 underline" onClick={() => setQ(`sell:${i.item}`, i.qty)}>
                        all
                      </button>
                    </div>
                  </div>
                  <button
                    className="btn-green min-w-[84px] px-3 py-2 text-sm"
                    disabled={!!busy[`sell:${i.item}`]}
                    onClick={() =>
                      run<{ qty: number; revenue: number; price_factor: number | string }>(
                        `sell:${i.item}`, "sell", { item: i.item, qty: n },
                        {
                          success: (r) =>
                            `Sold ${r.qty}× ${emoji(i.item)} for ${r.revenue} 🪙${Number(r.price_factor) < 1 ? " (market is flooded!)" : ""}`,
                        },
                      ).then(() => setQ(`sell:${i.item}`, 1))
                    }
                  >
                    Sell · {price * n}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

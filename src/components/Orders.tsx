"use client";

import { useAction, useConfig } from "@/lib/game";
import { emoji } from "@/lib/emoji";
import type { GameState } from "@/lib/types";

export function Orders({ state }: { state: GameState }) {
  const { data: config } = useConfig();
  const { run, busy } = useAction();
  if (!config) return null;
  const inv = Object.fromEntries(state.inventory.map((i) => [i.item, i.qty]));

  return (
    <section className="card">
      <h2 className="section-title">📜 Order Board</h2>
      <p className="-mt-2 mb-3 text-xs font-semibold text-grass-800/70">Each order can be delivered once per day.</p>
      <div className="flex flex-col gap-2">
        {Object.entries(config.orders).map(([id, o]) => {
          const ready = Object.entries(o.items).every(([item, n]) => (inv[item] ?? 0) >= n);
          return (
            <div key={id} className="rounded-2xl border-4 border-white bg-white p-3 shadow-chunky-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-extrabold text-grass-800">{o.name}</p>
                <span className="chip bg-sun-200 text-soil-600">🪙 {o.rewardCoin} · ⭐ {o.rewardXp}xp</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(o.items).map(([item, n]) => {
                  const have = inv[item] ?? 0;
                  return (
                    <span key={item} className={`chip ${have >= n ? "bg-grass-100 text-grass-700" : "bg-rose-50 text-rose-600"}`}>
                      {emoji(item)} {Math.min(have, n)}/{n}
                    </span>
                  );
                })}
              </div>
              <button
                className="btn-green mt-2 w-full py-1.5 text-sm"
                disabled={!ready || !!busy[`order:${id}`]}
                onClick={() =>
                  run<{ reward_coin: number }>(`order:${id}`, "complete-order", { orderId: id }, {
                    success: (r) => `📦 Delivered! +${r.reward_coin} 🪙`,
                  })
                }
              >
                {ready ? "Deliver" : "Need more items"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

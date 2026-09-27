"use client";

import { useConfig } from "@/lib/game";
import { emoji, titleCase } from "@/lib/emoji";
import type { GameState } from "@/lib/types";

export function Inventory({ state }: { state: GameState }) {
  const { data: config } = useConfig();
  const nameOf = (id: string) =>
    config?.crops[id]?.name ?? config?.shop[id]?.name ?? titleCase(id);

  return (
    <section className="card">
      <h2 className="section-title">🧺 Barn</h2>
      {state.inventory.length === 0 ? (
        <p className="rounded-2xl bg-grass-100 p-3 text-center text-sm font-semibold text-grass-800">
          Empty — harvest crops to fill it up!
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {state.inventory.map((i) => (
            <div key={i.item} className="flex flex-col items-center rounded-2xl border-4 border-white bg-sun-100 p-2 shadow-chunky-sm" title={nameOf(i.item)}>
              <span className="text-3xl">{emoji(i.item)}</span>
              <span className="font-display text-sm font-extrabold tabular-nums text-soil-600">×{i.qty}</span>
              <span className="w-full truncate text-center text-[10px] font-semibold text-grass-800/70">{nameOf(i.item)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

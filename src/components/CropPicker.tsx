"use client";

import { useConfig, formatDuration } from "@/lib/game";
import { emoji } from "@/lib/emoji";
import type { GameState, Plot } from "@/lib/types";
import { Sheet } from "./Sheet";

export function CropPicker({
  plot,
  state,
  onPick,
  onClose,
}: {
  plot: Plot | null;
  state: GameState;
  onPick: (plot: Plot, cropId: string) => void;
  onClose: () => void;
}) {
  const { data: config } = useConfig();
  const level = state.player.level;
  const coins = Number(state.player.coin_balance);

  return (
    <Sheet open={!!plot} onClose={onClose} title="🌱 What should we plant?">
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
                onClick={() => plot && onPick(plot, id)}
              >
                <span className="text-4xl">{emoji(id)}</span>
                <span className="font-display font-extrabold text-grass-800">{c.name}</span>
                <span className="text-xs font-semibold text-grass-800/70">⏱ {formatDuration(c.growSeconds * 1000)} · ×{c.yield}</span>
                <span className="mt-1 chip bg-sun-200 text-soil-600">{locked ? `🔒 Lv ${c.minLevel}` : `🪙 ${c.seedPrice}`}</span>
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

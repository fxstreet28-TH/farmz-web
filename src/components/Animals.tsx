"use client";

import { useState } from "react";
import { formatDuration, useAction, useConfig, useTick } from "@/lib/game";
import { emoji, titleCase } from "@/lib/emoji";
import type { Animal, GameState } from "@/lib/types";

export function Animals({ state, onShop }: { state: GameState; onShop: () => void }) {
  const now = useTick(1000);
  const { data: config } = useConfig();
  const { run, busy } = useAction();
  const [floaters, setFloaters] = useState<Record<string, string>>({});

  const inv = Object.fromEntries(state.inventory.map((i) => [i.item, i.qty]));

  const flash = (id: string, text: string) => {
    setFloaters((f) => ({ ...f, [id]: text }));
    setTimeout(() => setFloaters((f) => {
      const n = { ...f };
      delete n[id];
      return n;
    }), 1100);
  };

  const feed = (a: Animal) =>
    run<{ animal: Animal }>(`animal:${a.id}`, "feed-animal", { animalId: a.id }, {
      patch: (s, r) => ({ ...s, animals: s.animals.map((x) => (x.id === a.id ? r.animal : x)) }),
    }).then((r) => r && flash(a.id, "😋"));

  const collect = (a: Animal) =>
    run<{ item: string; qty: number }>(`animal:${a.id}`, "collect-produce", { animalId: a.id }, {
      patch: (s) => ({ ...s, animals: s.animals.map((x) => (x.id === a.id ? { ...x, produce_ready_at: null } : x)) }),
    }).then((r) => r && flash(a.id, `+${r.qty} ${emoji(r.item)}`));

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="section-title">🏡 Barnyard</h2>
        <button className="btn-ghost mb-3 py-1 text-sm" onClick={onShop}>
          🛒 Buy animals
        </button>
      </div>

      {state.animals.length === 0 ? (
        <div className="rounded-2xl bg-grass-100 p-4 text-center text-sm font-semibold text-grass-800">
          No animals yet. A 🐔 chicken costs 100 coins — buy one and some feed in the shop!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {state.animals.map((a) => {
            const cfg = config?.animals[a.type];
            const readyAt = a.produce_ready_at ? Date.parse(a.produce_ready_at) : null;
            const fedAt = a.fed_at ? Date.parse(a.fed_at) : null;
            const hungry = readyAt === null;
            const remaining = readyAt ? readyAt - now : 0;
            const looksReady = readyAt !== null && remaining <= 0;
            const pct = readyAt && fedAt && readyAt > fedAt ? Math.min(1, (now - fedAt) / (readyAt - fedAt)) : 0;
            const feedItem = cfg?.feedItem;
            const feedHave = feedItem ? inv[feedItem] ?? 0 : 0;
            const isBusy = !!busy[`animal:${a.id}`];

            return (
              <div key={a.id} className="relative flex flex-col items-center rounded-2xl border-4 border-white bg-sky-100 p-3 shadow-chunky-sm">
                <span className={`text-5xl ${looksReady ? "animate-wiggle" : hungry ? "" : "animate-sway"}`}>{emoji(a.type)}</span>
                <span className="font-display font-extrabold text-grass-800">{cfg?.name ?? titleCase(a.type)}</span>

                {hungry ? (
                  <>
                    <span className="text-xs font-semibold text-grass-800/70">Hungry 🥺</span>
                    {feedHave > 0 ? (
                      <button className="btn-green mt-2 w-full py-1.5 text-sm" disabled={isBusy} onClick={() => feed(a)}>
                        {emoji(feedItem)} Feed <span className="opacity-80">({feedHave})</span>
                      </button>
                    ) : (
                      <button className="btn-yellow mt-2 w-full py-1.5 text-sm" onClick={onShop}>
                        🛒 Buy {emoji(feedItem)} feed
                      </button>
                    )}
                  </>
                ) : looksReady ? (
                  <>
                    <span className="text-xs font-semibold text-grass-800/70">{emoji(cfg?.produce)} ready!</span>
                    <button className="btn-yellow mt-2 w-full py-1.5 text-sm" disabled={isBusy} onClick={() => collect(a)}>
                      Collect {emoji(cfg?.produce)}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-sky-200">
                      <div className="h-full rounded-full bg-sky-400 transition-[width] duration-1000" style={{ width: `${pct * 100}%` }} />
                    </div>
                    <span className="mt-1 text-xs font-bold tabular-nums text-grass-800/80">
                      {emoji(cfg?.produce)} in {formatDuration(remaining)}
                    </span>
                    {/* Server decides readiness; this lets the player try early and get the server's answer. */}
                    <button className="btn-ghost mt-2 w-full py-1.5 text-sm" disabled={isBusy} onClick={() => collect(a)}>
                      Collect
                    </button>
                  </>
                )}

                {floaters[a.id] && (
                  <span className="pointer-events-none absolute top-2 animate-float-up font-display text-lg font-extrabold text-grass-700">
                    {floaters[a.id]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

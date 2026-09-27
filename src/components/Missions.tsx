"use client";

import { fmtFarmz, MISSION_EMOJI, missionTitle } from "@/lib/emoji";
import type { GameState } from "@/lib/types";

export function Missions({ state }: { state: GameState }) {
  const done = state.missions.filter((m) => m.completed).length;
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title mb-0">📋 Daily Missions</h2>
        <span className="chip bg-grass-500 text-white">
          {done}/{state.missions.length} done
        </span>
      </div>
      <p className="-mt-1 mb-3 text-xs font-semibold text-grass-800/70">
        Resets at midnight (Bangkok time). Rewards are paid automatically. 🔥 Streak: {state.player.login_streak} day
        {state.player.login_streak === 1 ? "" : "s"}
      </p>

      {state.missions.length === 0 ? (
        <p className="text-sm">No missions today.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {state.missions.map((m) => {
            const pct = m.target > 0 ? Math.min(1, m.progress / m.target) : 0;
            const farmz = Number(m.reward_farmz);
            return (
              <li
                key={m.mission_id}
                className={`rounded-2xl border-4 p-3 shadow-chunky-sm ${m.completed ? "border-grass-300 bg-grass-100" : "border-white bg-white"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{m.completed ? "✅" : MISSION_EMOJI[m.kind] ?? "⭐"}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-display font-extrabold leading-tight ${m.completed ? "text-grass-600" : "text-grass-800"}`}>
                      {missionTitle(m.kind, m.target)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-grass-100">
                        <div
                          className={`h-full rounded-full transition-[width] duration-700 ${m.completed ? "bg-grass-500" : "bg-sun-400"}`}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-grass-800/80">
                        {m.progress}/{m.target}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 pl-9">
                  <span className={`chip ${m.completed ? "bg-grass-500 text-white" : "bg-sun-200 text-soil-600"}`}>
                    {m.completed ? "Earned " : ""}🪙 {m.reward_coin}
                  </span>
                  {farmz > 0 && (
                    <span className={`chip ${m.completed ? "bg-sky-400 text-white" : "bg-sky-200 text-sky-400"}`}>
                      🌟 {fmtFarmz(m.reward_farmz)} FARMZ
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

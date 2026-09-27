"use client";

// Game data hooks. Everything economic (coins, items, timers, mission progress) comes from the
// server; the client only renders it and names the action the player wants.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, friendlyError } from "./api";
import { useSession } from "./session";
import { useToast } from "@/components/Toast";
import type { CompletedMission, GameConfig, GameState } from "./types";
import { fmtFarmz, missionTitle } from "./emoji";

let clockOffsetMs = 0; // server_time - local time, updated on every state fetch

/** Current time on the server's clock (ms). Used only to render countdowns. */
export const serverNow = () => Date.now() + clockOffsetMs;

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => api.publicGet<GameConfig>("config"),
    staleTime: 10 * 60 * 1000,
  });
}

export function useGameState() {
  const { session, status } = useSession();
  return useQuery({
    queryKey: ["state", session?.wallet],
    enabled: status === "signed-in",
    queryFn: async () => {
      const t0 = Date.now();
      const s = await api.get<GameState>("state");
      const rtt = Date.now() - t0;
      clockOffsetMs = Date.parse(s.server_time) - (t0 + rtt / 2);
      return s;
    },
    refetchInterval: 30_000,
  });
}

/** Re-renders every `ms` so countdowns tick. */
export function useTick(ms = 1000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return serverNow();
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, "0")}s`;
  return `${sec}s`;
}

type MissionAware = { completed_missions?: CompletedMission[] };

/**
 * Runs a state-changing action against the backend, then refreshes game state.
 * Tracks in-flight keys so buttons can show a busy state and avoid double taps.
 */
export function useAction() {
  const qc = useQueryClient();
  const { session } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const inflight = useRef(new Set<string>());

  const run = useCallback(
    async <T extends object>(
      key: string,
      fn: string,
      body: Record<string, unknown>,
      opts: { success?: (r: T) => string | null; patch?: (s: GameState, r: T) => GameState } = {},
    ): Promise<T | null> => {
      if (inflight.current.has(key)) return null;
      inflight.current.add(key);
      setBusy((b) => ({ ...b, [key]: true }));
      const stateKey = ["state", session?.wallet];
      try {
        const r = await api.post<T>(fn, body);
        if (opts.patch) {
          const patch = opts.patch;
          qc.setQueryData<GameState>(stateKey, (s) => (s ? patch(s, r) : s));
        }
        const msg = opts.success?.(r);
        if (msg) toast(msg, "success");
        for (const m of (r as MissionAware).completed_missions ?? []) {
          const farmz = Number(m.reward_farmz) > 0 ? ` +${fmtFarmz(m.reward_farmz)} FARMZ` : "";
          toast(`🏆 Mission done! +${m.reward_coin} 🪙${farmz}`, "success");
        }
        await qc.invalidateQueries({ queryKey: stateKey });
        return r;
      } catch (e) {
        toast(friendlyError(e), "error");
        // Server state may differ from what we showed (e.g. NOT_READY) — resync.
        qc.invalidateQueries({ queryKey: stateKey });
        return null;
      } finally {
        inflight.current.delete(key);
        setBusy((b) => {
          const n = { ...b };
          delete n[key];
          return n;
        });
      }
    },
    [qc, session?.wallet, toast],
  );

  return { run, busy };
}

export { missionTitle };

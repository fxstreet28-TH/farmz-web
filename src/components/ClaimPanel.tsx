"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useReadContract, useReadContracts, useSwitchChain, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, farmzClaimAbi } from "@/lib/abi";
import { api, ApiError, friendlyError } from "@/lib/api";
import { env } from "@/lib/env";
import { useConfig } from "@/lib/game";
import { useSession } from "@/lib/session";
import { activeChain, wagmiConfig } from "@/lib/wagmi";
import type { ClaimTicket, GameState } from "@/lib/types";
import { useToast } from "./Toast";

// Backend answers these when claiming is switched off (no signer yet / chain RPC down) — show "soon", not an error.
const SOON_CODES = new Set(["SIGNER_NOT_CONFIGURED", "CHAIN_UNAVAILABLE"]);

type Phase = "idle" | "requesting" | "signing" | "confirming" | "done";

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function ClaimPanel({ state }: { state: GameState }) {
  const { address, chainId } = useAccount();
  const { session } = useSession();
  const { data: config } = useConfig();
  const toast = useToast();
  const qc = useQueryClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<Phase>("idle");
  const [soon, setSoon] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const token = { address: env.tokenAddress, abi: erc20Abi, chainId: activeChain.id } as const;
  const { data: tokenInfo, refetch: refetchBalance } = useReadContracts({
    contracts: [
      { ...token, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
      { ...token, functionName: "decimals" },
    ],
    query: { enabled: !!address, refetchInterval: 30_000 },
  });
  const { data: paused } = useReadContract({
    address: env.claimAddress,
    abi: farmzClaimAbi,
    functionName: "paused",
    chainId: activeChain.id,
    query: { refetchInterval: 60_000 },
  });

  const decimals = Number(tokenInfo?.[1]?.result ?? 18);
  const rawBal = tokenInfo?.[0]?.result as bigint | undefined;
  const onchain = rawBal !== undefined ? Number(formatUnits(rawBal, decimals)) : null;
  const claimable = Number(state.player.claimable_farmz ?? 0);
  const claimOff = soon || paused === true || (config !== undefined && config.claim.signer === null);

  const claim = async () => {
    if (!address) return;
    if (claimOff) {
      setSoon(true);
      return;
    }
    try {
      setPhase("requesting");
      const t = await api.post<ClaimTicket>("claim-request");
      if (t.account.toLowerCase() !== address.toLowerCase()) {
        throw new Error(`Switch your wallet to ${t.account.slice(0, 6)}…${t.account.slice(-4)} to claim`);
      }
      if (t.chainId !== activeChain.id) throw new Error(`Backend expects chain ${t.chainId}, app is set to ${activeChain.id}`);
      if (chainId !== activeChain.id) await switchChainAsync({ chainId: activeChain.id });

      setPhase("signing");
      const hash = await writeContractAsync({
        address: t.contract as `0x${string}`,
        abi: farmzClaimAbi,
        functionName: "claim",
        args: [BigInt(t.amountWei), BigInt(t.nonce), BigInt(t.deadline), t.signature],
        chainId: activeChain.id,
      });
      setLastTx(hash);

      setPhase("confirming");
      await api.post("claim-confirm", { claimId: t.claimId, txHash: hash }).catch(() => {});
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: activeChain.id });
      await api.post("claim-confirm", { claimId: t.claimId, txHash: hash }).catch(() => {});

      setPhase("done");
      toast(`🌟 Claimed ${t.amount} FARMZ!`, "success");
      refetchBalance();
      qc.invalidateQueries({ queryKey: ["state", session?.wallet] });
    } catch (e) {
      setPhase("idle");
      if (e instanceof ApiError && (SOON_CODES.has(e.code) || e.status === 503)) {
        setSoon(true);
        return;
      }
      if (e && typeof e === "object" && "name" in e && String((e as Error).name).includes("UserRejected")) {
        toast("Transaction cancelled — your signed claim stays valid for a while, just tap Claim again", "info");
        return;
      }
      toast(friendlyError(e), "error");
    }
  };

  const label =
    phase === "requesting" ? "Preparing…" :
    phase === "signing" ? "Confirm in wallet…" :
    phase === "confirming" ? "Confirming on-chain…" :
    claimOff ? "🔒 Claim" : "🌟 Claim FARMZ";

  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title mb-0 whitespace-nowrap">👛 FARMZ Wallet</h2>
        {claimOff && <span className="chip animate-pop whitespace-nowrap bg-sun-300 text-soil-600">⏳ Claim opening soon</span>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border-4 border-white bg-sun-100 p-3 shadow-chunky-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-soil-500">Claimable</p>
          <p className="font-display text-2xl font-extrabold tabular-nums text-soil-600">{fmt(claimable)}</p>
          <p className="text-xs font-semibold text-soil-500">FARMZ from missions</p>
        </div>
        <div className="rounded-2xl border-4 border-white bg-sky-100 p-3 shadow-chunky-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-400">In wallet</p>
          <p className="font-display text-2xl font-extrabold tabular-nums text-grass-800">{onchain === null ? "—" : fmt(onchain)}</p>
          <p className="text-xs font-semibold text-grass-800/70">FARMZ on {activeChain.name}</p>
        </div>
      </div>

      <button
        className={`${claimOff ? "btn-ghost" : "btn-yellow"} mt-3 w-full text-lg`}
        onClick={claim}
        disabled={phase === "requesting" || phase === "signing" || phase === "confirming" || (!claimOff && claimable <= 0)}
      >
        {label}
      </button>

      {claimOff ? (
        <p className="mt-2 text-center text-xs font-semibold text-grass-800/70">
          On-chain claiming isn&apos;t open yet. Keep farming — your claimable FARMZ is saved and waiting for you. 🌱
        </p>
      ) : (
        config && (
          <p className="mt-2 text-center text-xs font-semibold text-grass-800/70">
            Up to {config.claim.maxPerClaim} FARMZ per claim · one claim every {Math.round(config.claim.cooldownSeconds / 3600)}h · you pay a tiny gas fee
          </p>
        )
      )}

      {lastTx && (
        <a
          className="mt-2 block truncate text-center text-xs font-bold text-sky-400 underline"
          href={`${activeChain.blockExplorers?.default.url}/tx/${lastTx}`}
          target="_blank"
          rel="noreferrer"
        >
          View transaction ↗
        </a>
      )}
      <a
        className="mt-1 block text-center text-[11px] font-semibold text-grass-800/50 underline"
        href={`${activeChain.blockExplorers?.default.url}/token/${env.tokenAddress}`}
        target="_blank"
        rel="noreferrer"
      >
        FARMZ token contract ↗
      </a>
    </section>
  );
}

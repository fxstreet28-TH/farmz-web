"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSession } from "@/lib/session";

export function AuthGate() {
  const { status, signIn, error } = useSession();

  return (
    <div className="mx-auto mt-6 max-w-md px-4">
      <div className="card text-center">
        <div className="mb-2 flex justify-center gap-2 text-5xl">
          <span className="animate-sway">🌽</span>
          <span className="animate-wiggle">🐄</span>
          <span className="animate-sway">🍓</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-grass-700">Welcome to FarmZ!</h1>
        <p className="mt-1 text-sm text-grass-800/80">
          Plant crops, raise animals, finish daily missions and earn FARMZ on Base.
        </p>

        <div className="mt-5 flex flex-col items-center gap-3">
          {status === "disconnected" ? (
            <>
              <p className="text-sm font-bold text-grass-800">Step 1 · Connect your wallet</p>
              <ConnectButton label="Connect Wallet" />
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-grass-800">Step 2 · Sign in (free, no gas)</p>
              <button className="btn-green w-full max-w-xs text-lg" onClick={signIn} disabled={status === "signing"}>
                {status === "signing" ? "Check your wallet…" : "✍️ Sign in to your farm"}
              </button>
            </>
          )}
          {error && <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}

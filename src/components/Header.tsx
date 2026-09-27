"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/lib/game";
import { useSession } from "@/lib/session";

/** Coin counter that bumps and floats the delta whenever the server balance changes. */
function CoinBalance({ value }: { value: number }) {
  const prev = useRef<number | null>(null);
  const [floaters, setFloaters] = useState<{ id: number; delta: number }[]>([]);
  const [bumpKey, setBumpKey] = useState(0);

  useEffect(() => {
    if (prev.current !== null && prev.current !== value) {
      const delta = value - prev.current;
      const id = Date.now() + Math.random();
      setFloaters((f) => [...f, { id, delta }]);
      setBumpKey((k) => k + 1);
      setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1100);
    }
    prev.current = value;
  }, [value]);

  return (
    <div className="relative flex items-center gap-1.5 rounded-full border-4 border-white bg-sun-300 py-1 pl-1.5 pr-3 shadow-chunky-sm">
      <span key={bumpKey} className="animate-bump text-xl leading-none">🪙</span>
      <span className="font-display text-lg font-extrabold tabular-nums text-soil-600">{value.toLocaleString()}</span>
      {floaters.map((f) => (
        <span
          key={f.id}
          className={`pointer-events-none absolute -bottom-1 right-2 animate-float-up font-display text-base font-extrabold ${
            f.delta > 0 ? "text-grass-600" : "text-rose-500"
          }`}
        >
          {f.delta > 0 ? `+${f.delta}` : f.delta}
        </span>
      ))}
    </div>
  );
}

export function Header() {
  const { status, signOut } = useSession();
  const { data } = useGameState();

  return (
    <header className="sticky top-0 z-40 border-b-4 border-grass-400/60 bg-grass-300/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-3xl leading-none">🌽</span>
          <span className="hidden font-display text-2xl font-extrabold min-[360px]:inline tracking-tight text-white drop-shadow-[0_2px_0_rgba(56,106,23,0.8)]">
            FarmZ
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {data && (
            <>
              <span className="chip hidden border-2 border-white bg-sky-300 text-white sm:inline-flex">⭐ Lv {data.player.level}</span>
              <CoinBalance value={Number(data.player.coin_balance)} />
            </>
          )}
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              if (!mounted) return <div className="h-9 w-24" aria-hidden />;
              if (!account) {
                return (
                  <button className="btn-yellow py-1.5 text-sm" onClick={openConnectModal}>
                    Connect
                  </button>
                );
              }
              if (chain?.unsupported) {
                return (
                  <button className="btn bg-rose-500 py-1.5 text-sm text-white" onClick={openChainModal}>
                    Wrong network
                  </button>
                );
              }
              return (
                <div className="flex items-center gap-1">
                  <button className="btn-ghost whitespace-nowrap px-2.5 py-1.5 text-sm" onClick={openAccountModal} title={account.address}>
                    👛<span className="hidden sm:inline">{account.displayName}</span>
                    <span className="sm:hidden">…{account.address.slice(-4)}</span>
                  </button>
                  {status === "signed-in" && (
                    <button className="btn-ghost hidden px-2.5 py-1.5 text-sm sm:inline-flex" onClick={signOut} title="Sign out">
                      🚪
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
}

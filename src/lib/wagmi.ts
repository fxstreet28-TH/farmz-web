import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { env } from "./env";

export const activeChain = env.chainId === base.id ? base : baseSepolia;

export const wagmiConfig = getDefaultConfig({
  appName: "FarmZ",
  // WalletConnect needs a real project id; injected wallets (MetaMask, Coinbase, Rabby) work without it.
  projectId: env.walletConnectProjectId || "farmz-dev-placeholder",
  chains: [activeChain],
  transports: { [activeChain.id]: http() } as Record<number, ReturnType<typeof http>>,
  ssr: true,
});

// Public runtime config. NEXT_PUBLIC_* values are inlined at build time, so they must be
// referenced literally (no dynamic process.env[key] lookups).
import type { Address } from "viem";

export const env = {
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://egfrfhsscgomnxwuwqol.supabase.co").replace(/\/$/, ""),
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532"),
  tokenAddress: (process.env.NEXT_PUBLIC_FARMZ_TOKEN_ADDRESS ??
    "0xaA3639f77A827C5C8B16F7dB44aA4F54542Bb26B") as Address,
  claimAddress: (process.env.NEXT_PUBLIC_FARMZ_CLAIM_ADDRESS ??
    "0xCd1602e8bbCacC20b1be251B572f663484E8702c") as Address,
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
};

export const functionsUrl = `${env.supabaseUrl}/functions/v1`;

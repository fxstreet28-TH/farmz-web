# FarmZ Web 🌽

The FarmZ game client — a cozy Hay Day‑style farm sim on **Base Sepolia**.
Next.js 14 (App Router) · TypeScript · Tailwind · wagmi + viem + RainbowKit.

Plant crops, raise animals, finish daily missions, trade at the market and (soon) claim FARMZ on‑chain.
Every coin, item, timer and mission lives on the backend (Supabase edge functions); this app only
renders server state and names the action the player wants.

## Features

| Area | What it does | Backend |
| --- | --- | --- |
| Wallet | RainbowKit connect, locked to Base Sepolia (84532) | — |
| Sign‑in | SIWE (EIP‑4361): nonce → sign → verify → Supabase session JWT (auto‑refreshed) | `auth-nonce`, `auth-verify` |
| Farm | 3×3 plot grid, crop picker, growth stages + countdown from server `ready_at`, harvest | `state`, `plant`, `harvest` |
| Barnyard | Feed animals, production countdown, collect produce | `feed-animal`, `collect-produce` |
| Barn | Inventory from server state | `state` |
| Missions | Daily board with progress bars + coin/FARMZ rewards (paid automatically by the server) | `state` |
| Orders | Daily order board (counts toward `complete_order` missions) | `complete-order` |
| Market | Buy animals/feed, sell produce | `buy`, `sell` |
| Wallet | Claimable FARMZ, on‑chain `balanceOf`, claim flow; shows **“Claim opening soon”** while claims are paused | `config`, `claim-request`, `claim-confirm`, FarmZClaim contract |

The client never decides whether something is ready: countdowns are cosmetic, and the server's
answer (e.g. `NOT_READY`) always wins.

Claim flow: `claim-request` returns `{ claimId, amountWei, nonce, deadline, signature }`. The app calls
`FarmZClaim.claim(amountWei, nonce, deadline, signature)` via wagmi, then reports the tx with
`claim-confirm`. If the contract is `paused()`, the config has no signer, or the backend answers 503
(`SIGNER_NOT_CONFIGURED`), the panel shows a friendly “Claim opening soon” badge instead of an error.

## Setup

Requires Node 18.17+ (20+ recommended).

```bash
npm install
cp .env.local.example .env.local   # then fill in the two placeholders
npm run dev                        # http://localhost:3000
```

### Environment

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://egfrfhsscgomnxwuwqol.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → **anon public** key |
| `NEXT_PUBLIC_CHAIN_ID` | `84532` (Base Sepolia) |
| `NEXT_PUBLIC_FARMZ_TOKEN_ADDRESS` | `0xaA3639f77A827C5C8B16F7dB44aA4F54542Bb26B` |
| `NEXT_PUBLIC_FARMZ_CLAIM_ADDRESS` | `0xCd1602e8bbCacC20b1be251B572f663484E8702c` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Free project id from [cloud.walletconnect.com](https://cloud.walletconnect.com) (needed for mobile/QR wallets; browser‑extension wallets work without it) |

All `NEXT_PUBLIC_*` values end up in the browser bundle and are safe to expose (the anon key is
designed for frontends; RLS + edge functions guard the data). `.env.local` is git‑ignored — never
commit it.

### Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Deploy to Vercel

1. Push this repo to GitHub, then in Vercel: **Add New → Project → Import** `farmz-web`.
   Framework preset: **Next.js** (defaults are fine: `npm run build`, output `.next`).
2. **Settings → Environment Variables**: add the six variables above (Production + Preview).
3. Deploy. You get a URL such as `farmz-web.vercel.app`.
4. **Important — SIWE domain allow‑list (backend setting):** `auth-verify` only accepts sign‑in
   messages for domains listed in the backend secret `SIWE_ALLOWED_DOMAINS`
   (default: `localhost:3000,localhost:5173`). Add your Vercel host (no scheme), e.g.

   ```bash
   supabase secrets set SIWE_ALLOWED_DOMAINS="localhost:3000,localhost:5173,farmz-web.vercel.app" \
     --project-ref egfrfhsscgomnxwuwqol
   ```

   Until this is set, sign‑in on the Vercel URL fails with “domain isn't allowed” (the app says so).
   Preview deployments get unique hostnames. Either add the ones you need, or test sign‑in on the
   production domain.

## Turning on claims later

The UI is already wired. Once the backend has `CLAIM_SIGNER_PRIVATE_KEY` set, and the contract has
`setTrustedSigner(<signer>)` and `unpause()`, the “Claim opening soon” badge disappears automatically
(it reads `paused()` on‑chain and `config.claim.signer`). No frontend change is needed.

## Project layout

```
src/
  app/            layout, providers (wagmi/RainbowKit/react-query), main page + mobile tab bar
  components/     Header, AuthGate, FarmGrid, Animals, Inventory, Missions, Orders, Shop, ClaimPanel, Sheet, Toast
  lib/
    api.ts        edge-function fetch wrapper, token refresh, friendly error copy
    session.tsx   SIWE sign-in + session storage
    game.tsx      state/config queries, server-clock countdowns, action runner
    wagmi.ts      chain + wallet config
    abi.ts        FARMZ ERC-20 + FarmZClaim ABIs
    types.ts      backend response types
    emoji.ts      placeholder art (emoji) + mission copy
```

Art is emoji for now: swap `src/lib/emoji.ts` for sprites later.

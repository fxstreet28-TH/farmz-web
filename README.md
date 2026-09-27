# FarmZ Web 🌽

The FarmZ game client: a cozy low‑poly **3D** farm sim (Harvest Moon / Stardew vibe) on **Base Sepolia**.
Next.js 14 (App Router) · TypeScript · React Three Fiber + drei (three.js) · Tailwind · wagmi + viem + RainbowKit.

Plant crops, raise animals, finish daily missions, trade at the market and (soon) claim FARMZ on‑chain.
Every coin, item, timer and mission lives on the backend (Supabase edge functions); this app only
renders server state and names the action the player wants.

## Features

| Area | What it does | Backend |
| --- | --- | --- |
| Wallet | RainbowKit connect, locked to Base Sepolia (84532) | — |
| Sign‑in | SIWE (EIP‑4361): nonce → sign → verify → Supabase session JWT (auto‑refreshed) | `auth-nonce`, `auth-verify` |
| 3D Farm | Low‑poly scene: raised soil plots (grid from `state`), crop models per growth stage, harvest burst, orbit camera | `state`, `plant`, `harvest` |
| 3D Barnyard | Animated animals wander the pen; tap to feed / collect | `feed-animal`, `collect-produce` |
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

## 3D scene

- **Engine:** `@react-three/fiber` + `@react-three/drei`. The scene (`src/components/three/`) is loaded
  lazily with `next/dynamic` (`ssr: false`), so the HUD paints first and three.js never runs on the server.
- **Camera:** OrbitControls at a ~52° isometric‑ish angle. Pan is off, and zoom, tilt and rotation are
  clamped so it stays playable with one thumb. `CameraRig` frames the farm for the screen: portrait
  phones get a diagonal view (field in front, pen behind).
- **Interaction:** taps raycast into the scene. An empty plot opens the crop picker → `POST /plant`.
  A growing or ready plot → `POST /harvest` (the server answers `NOT_READY` if it isn't ready).
  An animal → `POST /feed-animal` or `POST /collect-produce`. Drags aren't counted as taps.
- **Server‑authoritative:** crop stage (seed → sprout → ripe) and countdowns are only derived from the
  server's `planted_at` / `ready_at` for display. Coins, items and timers come only from the backend.
- **Performance:**
  - Soil tiles and grass tufts are drawn with `<Instances>` (one draw call per kind).
  - GLBs are shared with `<Clone>`, and every model is under 600 triangles.
  - `dpr` is capped at `[1, 2]`, or `[1, 1.5]` on low‑end or touch devices, where shadows and part of
    the scenery are also dropped.
  - `PerformanceMonitor` lowers quality further if the frame rate falls, and `AdaptiveDpr` lowers
    resolution while the camera moves.
  - The shadow map is 1024².

## 3D assets (CC0)

All models live in `public/models/` and are mapped in **`src/config/assets.ts`**, the only file you
change to swap art.

| Pack (all CC0 1.0, by [Kenney](https://kenney.nl)) | Used for |
| --- | --- |
| [Nature Kit](https://kenney.nl/assets/nature-kit) | crop stages (wheat, corn, carrot, leafy sprouts, bush), fences + gate, trees, bushes, flowers, rocks, grass, log stack, stump |
| [Food Kit](https://kenney.nl/assets/food-kit) | ripe tomatoes and strawberries on the plants |
| [Cube Pets](https://kenney.nl/assets/cube-pets) | cow and chicken (with idle / walk / eat animations) |
| [Survival Kit](https://kenney.nl/assets/survival-kit) | barrel, crate, bucket, signpost |

The kits' license files are copied next to the models (`public/models/LICENSE-kenney-*.txt`). CC0
means free for commercial use with no attribution required, but crediting Kenney is appreciated.

**Still procedural placeholders** (simple low‑poly shapes in `src/components/three/Procedural.tsx`):

| Placeholder | Suggested CC0 replacement |
| --- | --- |
| Sheep | Quaternius "Animated Animals" / "Farm Animals" pack |
| Barn | Quaternius "Ultimate Farming" pack, or Poly Pizza CC0 barn |
| Hay bales, feeding trough | Quaternius "Ultimate Farming" |
| Unknown crops (added server‑side later) | add an entry to `CROP_MODELS` |

### Replacing a placeholder with a real .glb

1. Put the file in `public/models/<pack>/name.glb`. Keep it low‑poly (a few thousand triangles at most).
   If the GLB references external textures (e.g. `Textures/colormap.png`), copy those next to it too.
2. In `src/config/assets.ts`, change the entry, for example:
   ```ts
   sheep: { url: "/models/quaternius/Sheep.glb", scale: 0.5, y: 0, walkSpeed: 0.5, radius: 0.5 },
   ```
   - `scale`: uniform scale; a plot is about 1.2 units wide.
   - `y`: lift, so the model's feet sit on the ground.
   - `rotY`: rotation in radians.
   - `offset`: nudge, used to stack parts in composite crop stages.
3. Animated animals: clips named `idle`, `walk` and `eat` are played automatically, and other names
   fall back to `idle`.

Only use CC0 or properly licensed assets. Never use models ripped from commercial games.

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
public/models/    CC0 .glb models + license files
src/
  config/assets.ts  game id -> model map (swap art here)
  app/            layout, providers (wagmi/RainbowKit/react-query), main page: 3D scene + HUD
  components/     Header, AuthGate, CropPicker, Inventory, Missions, Orders, Shop, ClaimPanel, Sheet, Toast
  components/three/ FarmScene (Canvas, lights, controls), Plot3D, Animal3D, Scenery, Soil (instanced),
                  Model (glb/procedural), Procedural placeholders, CameraRig, layout
  lib/
    api.ts        edge-function fetch wrapper, token refresh, friendly error copy
    session.tsx   SIWE sign-in + session storage
    game.tsx      state/config queries, server-clock countdowns, action runner
    farmActions.ts plant/harvest/feed/collect + display-only crop/animal stage helpers
    wagmi.ts      chain + wallet config
    abi.ts        FARMZ ERC-20 + FarmZClaim ABIs
    types.ts      backend response types
    emoji.ts      placeholder art (emoji) + mission copy
```

HUD icons are still emoji (`src/lib/emoji.ts`). The farm itself is 3D.

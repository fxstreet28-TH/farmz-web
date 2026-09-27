// Thin fetch wrapper around the FarmZ Supabase edge functions.
// Every call carries the anon key as `apikey`; authenticated calls put the player's Supabase
// access token (minted by auth-verify) in `Authorization`. The server is the source of truth for
// every coin, item and timer — the client only names the action it wants.
import { env, functionsUrl } from "./env";

export class ApiError extends Error {
  constructor(public status: number, public code: string, public detail?: string) {
    super(code);
  }
}

export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  token_type?: string;
  wallet: string; // checksummed
}

type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;
let onUnauthorized: () => void = () => {};

export function setAuthHooks(provider: TokenProvider, unauthorized: () => void) {
  tokenProvider = provider;
  onUnauthorized = unauthorized;
}

async function request<T>(name: string, body?: unknown, opts: { auth?: boolean; method?: "GET" | "POST" } = {}): Promise<T> {
  const auth = opts.auth ?? true;
  const method = opts.method ?? "POST";
  const token = auth ? await tokenProvider() : null;
  if (auth && !token) throw new ApiError(401, "NOT_SIGNED_IN");

  let res: Response;
  try {
    res = await fetch(`${functionsUrl}/${name}`, {
      method,
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${token ?? env.supabaseAnonKey}`,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR");
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.slice(0, 200) };
    }
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; code?: string; msg?: string; message?: string; detail?: string };
    const code = d.error ?? d.code ?? d.msg ?? d.message ?? `HTTP_${res.status}`;
    if (res.status === 401 && auth) onUnauthorized();
    throw new ApiError(res.status, String(code), d.detail);
  }
  return data as T;
}

export const api = {
  post: <T>(name: string, body?: unknown) => request<T>(name, body),
  get: <T>(name: string) => request<T>(name, undefined, { method: "GET" }),
  publicPost: <T>(name: string, body?: unknown) => request<T>(name, body, { auth: false }),
  publicGet: <T>(name: string) => request<T>(name, undefined, { auth: false, method: "GET" }),
};

/** Exchanges a refresh token for a fresh session via Supabase GoTrue. */
export async function refreshSession(refreshToken: string): Promise<Omit<StoredSession, "wallet"> | null> {
  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: env.supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.access_token) return null;
    return {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at ?? Math.floor(Date.now() / 1000) + (d.expires_in ?? 3600),
      token_type: d.token_type,
    };
  } catch {
    return null;
  }
}

/** Human-friendly copy for server error codes. */
const ERROR_COPY: Record<string, string> = {
  NOT_SIGNED_IN: "Sign in with your wallet first",
  NETWORK_ERROR: "Can't reach the farm server — check your connection",
  RATE_LIMITED: "Whoa, slow down a little!",
  INSUFFICIENT_COINS: "Not enough coins",
  NOT_ENOUGH_ITEMS: "You don't have enough of that",
  INVENTORY_FULL: "Your barn is full — sell something first",
  NOT_READY: "Not ready yet — give it a bit more time",
  PLOT_NOT_EMPTY: "That plot is already planted",
  PLOT_EMPTY: "Nothing is growing there",
  ALREADY_FED: "Already fed — wait for the produce",
  NOT_FED: "Feed it first",
  ANIMAL_LIMIT: "You've reached the limit for that animal",
  LEVEL_TOO_LOW: "Level too low for that",
  ORDER_ALREADY_DONE: "Order already completed today",
  CLAIM_PENDING: "A claim is already in progress",
  CLAIM_COOLDOWN: "Claim cooldown — try again later",
  NOTHING_TO_CLAIM: "Nothing to claim yet",
  UNKNOWN_CROP: "Unknown crop",
  UNKNOWN_ITEM: "Unknown item",
  UNAUTHORIZED: "Session expired — please sign in again",
  NO_PLAYER: "Player not found — please sign in again",
  BAD_SIGNATURE: "Signature didn't match — try again",
  BAD_NONCE: "Sign-in request expired — try again",
  SIWE_DOMAIN_NOT_ALLOWED: "This site's domain isn't allowed by the backend yet (SIWE_ALLOWED_DOMAINS)",
  SIWE_WRONG_CHAIN: "Wrong network — switch to Base Sepolia",
  SIWE_STALE: "Sign-in message expired — try again",
};

export function friendlyError(e: unknown): string {
  if (e instanceof ApiError) return ERROR_COPY[e.code] ?? e.detail ?? e.code.replace(/_/g, " ").toLowerCase();
  if (e && typeof e === "object" && "shortMessage" in e) return String((e as { shortMessage: string }).shortMessage);
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

"use client";

// SIWE session: auth-nonce -> sign EIP-4361 message -> auth-verify -> Supabase session JWT.
// The session is kept per wallet in localStorage and refreshed via GoTrue before it expires.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAddress } from "viem";
import { createSiweMessage } from "viem/siwe";
import { useAccount, useSignMessage } from "wagmi";
import { api, ApiError, friendlyError, refreshSession, setAuthHooks, type StoredSession } from "./api";
import { env } from "./env";

const STORAGE_PREFIX = "farmz.session.";

function load(wallet: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + wallet.toLowerCase());
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function save(s: StoredSession | null, wallet: string) {
  try {
    if (s) localStorage.setItem(STORAGE_PREFIX + wallet.toLowerCase(), JSON.stringify(s));
    else localStorage.removeItem(STORAGE_PREFIX + wallet.toLowerCase());
  } catch {
    /* storage unavailable (private mode) — session lives in memory only */
  }
}

type Status = "disconnected" | "signed-out" | "signing" | "signed-in";

interface SessionCtx {
  status: Status;
  session: StoredSession | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<SessionCtx | null>(null);

interface NonceResponse {
  nonce: string;
  chainId: number;
  expiresAt: string;
  domains?: string[];
}

interface VerifyResponse {
  session: { access_token: string; refresh_token: string; expires_at: number; token_type?: string };
  wallet: string;
  checkin?: unknown;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<StoredSession | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);

  const update = useCallback((s: StoredSession | null, wallet?: string) => {
    sessionRef.current = s;
    setSession(s);
    if (wallet) save(s, wallet);
  }, []);

  // Restore the stored session whenever the connected wallet changes.
  useEffect(() => {
    setError(null);
    if (!address) {
      update(null);
      return;
    }
    const stored = load(address);
    update(stored && stored.wallet.toLowerCase() === address.toLowerCase() ? stored : null);
  }, [address, update]);

  const signOut = useCallback(() => {
    const wallet = sessionRef.current?.wallet ?? address;
    if (wallet) save(null, wallet);
    update(null);
  }, [address, update]);

  // Access token for API calls; refreshes when within 60s of expiry.
  const getToken = useCallback(async (): Promise<string | null> => {
    const s = sessionRef.current;
    if (!s) return null;
    if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
    refreshing.current ??= (async () => {
      const fresh = await refreshSession(s.refresh_token);
      if (!fresh) {
        update(null, s.wallet);
        return null;
      }
      const next = { ...fresh, wallet: s.wallet };
      update(next, s.wallet);
      return next.access_token;
    })().finally(() => {
      refreshing.current = null;
    });
    return refreshing.current;
  }, [update]);

  useEffect(() => {
    setAuthHooks(getToken, () => {
      const s = sessionRef.current;
      if (s) update(null, s.wallet);
    });
  }, [getToken, update]);

  const signIn = useCallback(async () => {
    if (!address) return;
    setSigning(true);
    setError(null);
    try {
      const { nonce, chainId } = await api.publicPost<NonceResponse>("auth-nonce", { address });
      const message = createSiweMessage({
        address: getAddress(address),
        chainId: chainId ?? env.chainId,
        domain: window.location.host,
        uri: window.location.origin,
        nonce,
        version: "1",
        statement: "Sign in to FarmZ. This does not cost gas or move any tokens.",
        issuedAt: new Date(),
        expirationTime: new Date(Date.now() + 10 * 60 * 1000),
      });
      const signature = await signMessageAsync({ message });
      const res = await api.publicPost<VerifyResponse>("auth-verify", { message, signature });
      update({ ...res.session, wallet: getAddress(res.wallet ?? address) }, address);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.code === "SIWE_DOMAIN_NOT_ALLOWED"
          ? `Backend doesn't allow the domain "${window.location.host}" yet. Add it to SIWE_ALLOWED_DOMAINS.`
          : friendlyError(e));
      } else if (e && typeof e === "object" && "name" in e && (e as Error).name === "UserRejectedRequestError") {
        setError("Signature request was cancelled");
      } else {
        setError(e instanceof Error ? ((e as { shortMessage?: string }).shortMessage ?? e.message) : "Sign-in failed");
      }
    } finally {
      setSigning(false);
    }
  }, [address, signMessageAsync, update]);

  const status: Status = !isConnected ? "disconnected" : signing ? "signing" : session ? "signed-in" : "signed-out";

  const value = useMemo(() => ({ status, session, error, signIn, signOut }), [status, session, error, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

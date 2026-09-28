"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Versioned key of the persisted session. The `v1` suffix is deliberate: a
 * future payload shape can migrate by reading the old key and dropping it,
 * instead of guessing whether an unversioned value has the new shape.
 */
export const SESSION_STORAGE_KEY = "bia.session.v1";

/** The identity the login endpoint returns and the JWT payload carries. */
export interface SessionUser {
  username: string;
  name: string;
  authorized: boolean;
}

/** A decoded, still-valid session: the raw token plus what the app reads. */
export interface Session {
  token: string;
  user: SessionUser;
  /** `exp` from the JWT, in epoch milliseconds. */
  expiresAt: number;
}

/** What `useSession` exposes to a component. */
export interface SessionState {
  /** The current session, or `null` when there is none. */
  session: Session | null;
  /** `false` until the client has read storage; the server render is always `false`. */
  ready: boolean;
  /** Clears the stored token and notifies every subscriber. */
  signOut: () => void;
}

/** Subscribers re-read the session when it changes (local actions or another tab). */
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `localStorage` throws in private/blocked-storage modes, so every access is
 * best-effort: a locked-down browser must render the login form, not crash.
 */
function readStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    // Ignored on purpose: the in-memory session still applies for this session.
  }
}

function removeStoredToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignored on purpose: see `writeStoredToken`.
  }
}

/**
 * Decodes a JWT payload (`base64url` middle segment) by hand. There is no auth
 * library in this project and none is added; the token's signature is never
 * verified here because the backend is the only party that can.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const remainder = base64.length % 4;
    const padded = remainder === 0 ? base64 : base64.padEnd(base64.length + (4 - remainder), "=");
    const parsed: unknown = JSON.parse(atob(padded));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Turns a raw token into a session, or `null` when it is missing the fields
 * the app reads or has already expired. An expired token is treated exactly
 * like no token: `exp` is checked here, not trusted downstream.
 */
function decodeSession(token: string): Session | null {
  const payload = decodeJwtPayload(token);
  if (payload === null) {
    return null;
  }

  const { sub, name, authorized, exp } = payload;
  if (typeof sub !== "string" || sub.length === 0) {
    return null;
  }
  if (typeof name !== "string") {
    return null;
  }
  if (typeof authorized !== "boolean") {
    return null;
  }
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return null;
  }
  if (exp * 1000 <= Date.now()) {
    return null;
  }

  return {
    token,
    user: { username: sub, name, authorized },
    expiresAt: exp * 1000,
  };
}

/** Reads the persisted token and decodes it. `null` means "no valid session". */
export function getSession(): Session | null {
  const token = readStoredToken();
  if (token === null) {
    return null;
  }
  return decodeSession(token);
}

/**
 * Persists a freshly issued token. Returns the decoded session, or `null` when
 * the token is malformed or already expired — in which case nothing is written.
 */
export function saveSession(token: string): Session | null {
  const session = decodeSession(token);
  if (session === null) {
    return null;
  }
  writeStoredToken(token);
  emit();
  return session;
}

/** Removes the persisted token and notifies every subscriber. */
export function clearSession(): void {
  removeStoredToken();
  emit();
}

/**
 * Subscribes to session changes. Local writes notify directly (the `storage`
 * event does not fire in the tab that wrote it); other tabs are covered by the
 * `storage` event.
 */
export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }

  const onStorage = (event: StorageEvent): void => {
    if (event.key === null || event.key === SESSION_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/*
 * `getSnapshot` for `useSyncExternalStore` must return a STABLE reference while
 * the store is unchanged, so the decoded session is cached and only recomputed
 * when the raw token changes. A session whose `exp` has passed while the tab
 * stayed open stops being reported (and keeps returning the same `null`).
 */
let cachedToken: string | null | undefined;
let cachedSession: Session | null = null;

function getSessionSnapshot(): Session | null {
  const token = readStoredToken();
  if (token !== cachedToken) {
    cachedToken = token;
    cachedSession = token === null ? null : decodeSession(token);
    return cachedSession;
  }
  if (cachedSession !== null && cachedSession.expiresAt <= Date.now()) {
    cachedSession = null;
  }
  return cachedSession;
}

/** The server render has no `localStorage`, so it always sees no session. */
function getServerSnapshot(): Session | null {
  return null;
}

const subscribeNothing = (): (() => void) => () => {};
const getHydrated = (): boolean => true;
const getServerHydrated = (): boolean => false;

/**
 * Reads the session on the client and re-reads it on every change.
 *
 * `ready` distinguishes "no session" from "the client has not read storage
 * yet". During server rendering and hydration it is `false`, so a component
 * never treats the server's `null` as "logged out" and redirects a signed-in
 * user; on a client-only render it is `true` from the first render.
 */
export function useSession(): SessionState {
  const session = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSnapshot,
  );
  const ready = useSyncExternalStore(
    subscribeNothing,
    getHydrated,
    getServerHydrated,
  );

  const signOut = useCallback((): void => {
    clearSession();
  }, []);

  return { session, ready, signOut };
}

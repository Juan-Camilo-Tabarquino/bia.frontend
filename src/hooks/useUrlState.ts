"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Generic URL-backed state.
 *
 * The query string is treated as a *serialization layer* over a typed state
 * object, never as the place where behaviour lives: the caller keeps deciding
 * semantics (what a filter means, what the default sort is) and only declares
 * here how each value travels in and out of the URL.
 *
 * Two rules hold for every declared field, so no caller has to re-implement
 * them:
 *
 * - **Absent means default.** A missing (or empty) parameter deserializes to
 *   `defaultValue`, and a `defaultValue` never gets written back to the URL.
 *   That keeps the default view link-identical to `/path` and keeps shared
 *   links honest: they only carry what the user actually chose.
 * - **Invalid is ignored.** A parameter whose raw value `parse` rejects also
 *   resolves to `defaultValue` — it must never crash the page and it must not
 *   be mistaken for active state.
 *
 * The hook is deliberately field-name agnostic (a `UrlStateSchema<T>` maps each
 * key of `T` to one parameter) so later phases can reuse it instead of growing
 * another URL reader.
 */

export interface UrlStateField<Value> {
  /** Query string parameter name, e.g. `"meter_id"`. */
  param: string;
  /** Value used when the parameter is absent, empty, or invalid. */
  defaultValue: Value;
  /**
   * Turns a raw (non-empty) parameter value into state. Returning `undefined`
   * marks the value as invalid, which resolves to `defaultValue`.
   */
  parse: (raw: string) => Value | undefined;
  /**
   * Turns a state value into its parameter value. Returning `null` (or an
   * empty string) omits the parameter completely, which is how a cleared value
   * leaves no `severity=` / `severity=null` residue behind.
   */
  serialize: (value: Value) => string | null;
}

/** One field per key of `T`, so a schema cannot silently miss a key. */
export type UrlStateSchema<T extends object> = {
  [Key in keyof T]: UrlStateField<T[Key]>;
};

/**
 * Runtime view of a field. Per-key value types only exist at compile time, so
 * the iteration below works on the erased shape; the cast stays inside this
 * helper and never leaks to callers.
 */
interface RuntimeUrlStateField {
  param: string;
  defaultValue: unknown;
  parse: (raw: string) => unknown;
  serialize: (value: unknown) => string | null;
}

function runtimeFields<T extends object>(
  schema: UrlStateSchema<T>,
): [string, RuntimeUrlStateField][] {
  return Object.entries(schema) as [string, RuntimeUrlStateField][];
}

/** Deserializes a query string into a complete state object. */
export function parseUrlState<T extends object>(
  schema: UrlStateSchema<T>,
  params: URLSearchParams | null | undefined,
): T {
  const state: Record<string, unknown> = {};

  for (const [key, field] of runtimeFields(schema)) {
    const raw = params?.get(field.param) ?? null;
    const parsed = raw === null || raw === "" ? undefined : field.parse(raw);
    state[key] = parsed === undefined ? field.defaultValue : parsed;
  }

  return state as T;
}

/**
 * Serializes a state object into the parameters it should occupy. Default and
 * cleared values are omitted, so the resulting string is the smallest honest
 * description of the view.
 */
export function serializeUrlState<T extends object>(
  schema: UrlStateSchema<T>,
  state: T,
): URLSearchParams {
  const params = new URLSearchParams();
  const values = state as Record<string, unknown>;

  for (const [key, field] of runtimeFields(schema)) {
    const raw = field.serialize(values[key]);
    // `undefined` is filtered alongside `null` and `""`: the runtime view of a
    // field erases its per-key type, so an incomplete state object (a caller
    // spreading only the keys it knows about) would otherwise serialize the
    // literal string `"undefined"` into the URL and create a parameter that
    // looks active but parses back to nothing.
    if (raw !== null && raw !== undefined && raw !== "") {
      params.set(field.param, raw);
    }
  }

  return params;
}

/**
 * Reads `[state, setState]` from the current URL once, on mount, and mirrors
 * every later `setState` back into it.
 *
 * The URL is *not* a live source of truth after mount: writes use
 * `router.replace` with `scroll: false`, so no history entry is pushed and
 * there is no back/forward step to re-synchronize from. The local state stays
 * authoritative for rendering, which also keeps the write path from turning
 * into a render loop.
 *
 * `update` accepts a value or an updater, exactly like `useState`'s setter, and
 * callers that merge into the current state **must use the updater form**.
 * Spreading a captured value (`{ ...state, ...patch }`) silently drops an
 * earlier update whenever two land before a re-render, which is exactly what
 * happens here: the search box publishes a settled term and the filter state it
 * merges into was captured one render earlier.
 */
export function useUrlState<T extends object>(
  schema: UrlStateSchema<T>,
): [T, (next: T | ((previous: T) => T)) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [state, setState] = useState<T>(() =>
    parseUrlState(schema, searchParams),
  );

  // Holds the latest committed state so the URL write below reflects the value
  // actually applied, including inside an updater call.
  const stateRef = useRef(state);

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(stateRef.current) : next;
      stateRef.current = resolved;
      setState(resolved);

      // `useRouter` is unavailable outside the App Router context (and in test
      // doubles that only stub `useSearchParams`). A missing router must not
      // crash a render pass or an event handler.
      if (typeof router?.replace !== "function") {
        return;
      }

      const base =
        pathname ??
        (typeof window === "undefined" ? "" : window.location.pathname);

      // Parameters this schema does not own, and any fragment, are carried over
      // instead of being dropped: the hook only owns the keys it was given, and
      // silently stripping an analytics tag (or a `#section`) on the first
      // interaction would be a destruction, not a serialization.
      //
      // Every key the schema owns is deleted first — not just the keys the new
      // state happens to emit. A value that was just cleared emits nothing, so
      // looking at `owned` alone would leave the cleared parameter in the URL
      // while the state says it is gone.
      const carried = new URLSearchParams(searchParams?.toString() ?? "");
      for (const { param } of Object.values(schema) as RuntimeUrlStateField[]) {
        carried.delete(param);
      }
      for (const [param, value] of serializeUrlState(schema, resolved).entries()) {
        carried.set(param, value);
      }

      const foreign = carried.toString();
      const query = foreign.length > 0 ? `?${foreign}` : "";
      const hash =
        typeof window === "undefined" ? "" : window.location.hash;

      router.replace(`${base}${query}${hash}`, {
        scroll: false,
      });
    },
    [router, pathname, schema, searchParams],
  );

  return [state, update];
}

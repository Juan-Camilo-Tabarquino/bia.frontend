"use client";

import { useEffect, useState } from "react";

/**
 * Default debounce window, in milliseconds.
 *
 * Exported so callers and tests can reason about the delay without repeating
 * the same magic number, while every call may still inject its own value.
 */
export const DEFAULT_DEBOUNCE_MS = 250;

/**
 * Returns `value`, but only after it has stayed unchanged for `delayMs`.
 *
 * Why this exists: the meter and anomaly search boxes filter arrays that are
 * already in the browser, so the filtering itself is cheap. What is not cheap
 * is committing every keystroke to the shared state — on `/anomalies` that
 * state is the URL, and `router.replace` per key would fire a navigation for
 * each character typed. Debouncing the *value* instead of wrapping the event
 * handler keeps the consumer declarative: it renders from
 * `useDebouncedValue(query)` and never has to manage a timer itself.
 *
 * The effect is StrictMode-safe. React's double-invoked setup runs the cleanup
 * between the two runs, so the first `setTimeout` is cancelled and only the
 * second one survives — the settled value is emitted once, never twice. That
 * `setTimeout` is also why every test that renders a consumer goes through
 * `<StrictMode>`.
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs: number = DEFAULT_DEBOUNCE_MS,
): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}

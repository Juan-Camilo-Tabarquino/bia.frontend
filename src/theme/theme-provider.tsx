"use client";

import { ConfigProvider } from "antd";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { darkTheme, lightTheme } from "./tokens";

export type ThemeMode = "dark" | "light";

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue | null>(
  null,
);

const STORAGE_KEY = "bia-theme";

/**
 * Reads the current mode and the two writers. Throws when used outside
 * `ThemeProvider` so a missing provider fails loudly instead of silently
 * defaulting to a broken mode.
 */
export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (context === null) {
    throw new Error("useThemeMode must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Best-effort persistence. `localStorage` throws in private/blocked-storage
 * modes; a theme preference is never worth crashing the app over.
 */
function readStoredMode(): ThemeMode | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignored on purpose: the in-memory mode still applies for this session.
  }
}

/**
 * Theme owner. Dark is the default on both server and first client render so
 * hydration matches; the stored preference is read only after mount, because
 * the server has no `localStorage`.
 *
 * Persistence lives in the user actions (`setMode`/`toggle`) rather than in an
 * effect keyed on `[mode]`. A persist-on-change effect also runs on the mount
 * commit, where `mode` is still the default `"dark"` and the read effect's
 * state update has not been applied yet. StrictMode double-invokes that mount,
 * so the stale default is written before the remount reads it back, destroying
 * a stored `"light"`. Writing only when the user acts removes that stale write.
 * The `[mode]` effect that applies `data-theme`/`colorScheme` stays because it
 * is idempotent and touches no persisted data.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const stored = readStoredMode();
    if (stored !== null) {
      // One-time hydration-safe read of the persisted preference. Reading it
      // during render would break the server, which has no localStorage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModeState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    writeStoredMode(next);
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, toggle }}>
      <ConfigProvider theme={mode === "dark" ? darkTheme : lightTheme}>
        {children}
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}

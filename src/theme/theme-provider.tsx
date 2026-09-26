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
 * Theme owner. Dark is the default on both server and first client render so
 * hydration matches; the stored preference is read only after mount, because
 * the server has no `localStorage`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      // One-time hydration-safe read of the persisted preference. Reading it
      // during render would break the server, which has no localStorage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, toggle }}>
      <ConfigProvider theme={mode === "dark" ? darkTheme : lightTheme}>
        {children}
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}

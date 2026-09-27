import { theme, type ThemeConfig } from "antd";

/**
 * Class that carries antd's `--bia-*` variable scope. antd normally scopes the
 * variables to a React-generated class on its components, which leaves `body`
 * (an ancestor of the shell) unable to resolve them; pinning `cssVar.key` makes
 * the scope class stable so the root layout can put it on `<html>`.
 */
export const CSS_VAR_SCOPE_CLASS = "bia-theme";

/**
 * Bia brand palette.
 *
 * Every value here is traced to Bia's live assets rather than invented, so the
 * app reads as Bia's own product. `tealDeep` exists because `#08DDBC` is about
 * 1.6:1 on white and is unusable as text, so light mode uses a darker teal
 * while dark mode keeps the bright brand teal.
 */
export const brand = {
  teal: "#08DDBC", // exact: bia.app brand gradient #08ddbc -> #17ffdb
  tealBright: "#17FFDB",
  tealDeep: "#0F766E", // light-mode primary: #08DDBC is ~1.6:1 on white (unusable as text),
  // and #0D9488 only reaches ~3.7:1, below the 4.5:1 WCAG AA floor for normal-size
  // text, which is what antd uses colorPrimary for in links. #0F766E is ~5.5:1.
  cyan: "#06B6D4", // exact
  success: "#10B981", // exact
  border: "#27272A", // exact
  muted: "#A1A1AA", // exact
  reference: "#8B5CF6", // perceptual read of Bia's dashed average line (their product screenshots)
  darkBg: "#0B0F11",
  darkSurface: "#151B1D",
  lightBg: "#F7F8F9",
  lightSurface: "#FFFFFF",
} as const;

/**
 * Colours for the surfaces that cannot go through CSS variables.
 *
 * SVG presentation attributes (recharts' `stroke`/`fill`) do not reliably
 * resolve `var()`: SVG2 still defines them as parsed grammar rather than CSS
 * declarations, so substitution is not guaranteed, and the W3C issue is open
 * (svgwg#1031, raised 2025-11). Anything passed to recharts therefore takes a
 * real value from here. The brand wordmark keeps the exact brand gradient on
 * purpose: a wordmark is exempt from token derivation.
 *
 * The map covers both modes for every graphical role the chart needs — the
 * series, the anomaly marker and its surface, the grid, the axis ticks, the
 * reference line and the tooltip surface/text — so a mode switch repaints the
 * chart instead of leaving a colour pinned to the other theme.
 */
export const chartColors = {
  dark: {
    series: brand.teal,
    marker: "#F87171",
    markerSurface: "#2C1618",
    grid: "#243032",
    axis: "#8B9399",
    reference: brand.reference,
    tooltipBackground: brand.darkSurface,
    tooltipBorder: brand.border,
    tooltipText: "#E4E4E7",
  },
  light: {
    series: brand.tealDeep,
    marker: "#DC2626",
    markerSurface: "#FFF1F0",
    grid: "#E5E7EB",
    axis: "#52525B",
    reference: brand.reference,
    tooltipBackground: brand.lightSurface,
    tooltipBorder: "#E5E7EB",
    tooltipText: "#18181B",
  },
} as const;

/**
 * Tokens shared by both themes. `fontFamily` reads the Inter CSS variable set
 * by `next/font` in the root layout.
 */
export const sharedTokens = {
  fontFamily:
    "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  borderRadius: 8,
  controlHeight: 36,
  fontSize: 14,
} as const;

/**
 * Dark theme (the default). `cssVar` emits every token as a `--bia-*` CSS
 * variable so the SCSS modules can be theme-aware without re-typing colours.
 */
export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: brand.teal,
    colorLink: brand.teal,
    colorInfo: brand.cyan,
    colorSuccess: "#34D399",
    colorError: "#F87171",
    colorBgBase: brand.darkBg,
    colorBgContainer: brand.darkSurface,
    colorBorderSecondary: brand.border,
    colorTextSecondary: brand.muted,
  },
  cssVar: { prefix: "bia", key: CSS_VAR_SCOPE_CLASS },
};

/**
 * Light theme, reached through the header toggle. Same token layer, different
 * algorithm and primary, which is what makes the toggle a real token switch
 * rather than a dark coat of paint.
 */
export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: brand.tealDeep,
    colorLink: brand.tealDeep,
    colorInfo: "#0891B2",
    colorSuccess: brand.success,
    colorError: "#DC2626",
    colorBgBase: brand.lightBg,
    colorBgContainer: brand.lightSurface,
    colorBorderSecondary: "#E5E7EB",
    colorTextSecondary: "#52525B",
  },
  cssVar: { prefix: "bia", key: CSS_VAR_SCOPE_CLASS },
};

import type { ReactNode } from "react";

/**
 * The deterministic recharts stand-ins used by every suite that renders the
 * readings chart.
 *
 * Why this is a shared module and not a copy per suite: `ResponsiveContainer`
 * measures 0 in jsdom, so every suite must replace recharts with stand-ins.
 * That used to be three independent inline `jest.mock("recharts", …)` blocks,
 * each listing its own subset of components — and when the chart gained
 * `CartesianGrid` and `ReferenceLine`, one of the three was missed and four
 * tests crashed with "Element type is invalid … got: undefined". A single
 * factory means a new chart component is added in one place, and a suite can
 * no longer silently mock less than the component renders.
 *
 * The stand-ins render real DOM nodes carrying the props under test, so a test
 * asserts at the props boundary (what the component asks recharts to draw)
 * rather than trying to read SVG that jsdom cannot lay out.
 */
export function createRechartsMock(): Record<string, unknown> {
  // Required lazily: `jest.mock` factories run before module imports are
  // hoisted, so `react` must be pulled in through `requireActual`.
  const ReactModule =
    jest.requireActual<typeof import("react")>("react") as typeof import("react");

  const element = (
    tag: string,
    props: Record<string, unknown>,
    children?: ReactNode,
  ) => ReactModule.createElement(tag, props, children);

  return {
    ResponsiveContainer: ({
      children,
      ...rest
    }: { children?: ReactNode } & Record<string, unknown>) =>
      element("div", rest, children),

    LineChart: ({
      data,
      children,
    }: {
      data?: Array<Record<string, unknown>>;
      children?: ReactNode;
    }) =>
      element(
        "div",
        {
          "data-testid": "line-chart",
          "data-points": JSON.stringify(data ?? []),
        },
        children,
      ),

    Line: ({ dataKey }: { dataKey?: string }) =>
      element("div", { "data-testid": "line", "data-key": dataKey }),

    CartesianGrid: ({
      stroke,
      strokeDasharray,
    }: {
      stroke?: string;
      strokeDasharray?: string;
    }) =>
      element("div", {
        "data-testid": "cartesian-grid",
        "data-stroke": stroke,
        "data-stroke-dasharray": strokeDasharray,
      }),

    // Asserted at the props boundary: the Y value (the baseline mean), the
    // stroke colour and the dash pattern are what a real line would draw from.
    ReferenceLine: ({
      y,
      stroke,
      strokeDasharray,
      label,
    }: {
      y?: number | string;
      stroke?: string;
      strokeDasharray?: string;
      label?: unknown;
    }) => {
      const labelValue =
        label && typeof label === "object" && "value" in label
          ? String((label as { value?: unknown }).value)
          : String(label ?? "");
      return element("div", {
        "data-testid": "reference-line",
        "data-y": y === undefined ? "" : String(y),
        "data-stroke": stroke,
        "data-stroke-dasharray": strokeDasharray,
        "data-label": labelValue,
      });
    },

    XAxis: ({
      dataKey,
      tickFormatter,
    }: {
      dataKey?: string;
      tickFormatter?: (value: unknown) => string;
    }) =>
      element("div", {
        "data-testid": "x-axis",
        "data-key": dataKey,
        "data-tick-output": tickFormatter
          ? tickFormatter("2024-01-01T00:00:00Z")
          : "",
      }),

    YAxis: ({ unit }: { unit?: string | number }) =>
      element("div", {
        "data-testid": "y-axis",
        "data-unit": unit === undefined ? "" : String(unit),
      }),

    Tooltip: ({
      labelFormatter,
      contentStyle,
    }: {
      labelFormatter?: (label: unknown) => ReactNode;
      contentStyle?: Record<string, unknown>;
    }) =>
      element("div", {
        "data-testid": "tooltip",
        "data-label-output": labelFormatter
          ? String(labelFormatter("2024-01-01T00:00:00Z"))
          : "",
        "data-content-style": JSON.stringify(contentStyle ?? {}),
      }),
  };
}

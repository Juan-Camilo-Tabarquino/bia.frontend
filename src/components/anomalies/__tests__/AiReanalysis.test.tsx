import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Anomaly, AnalysisResult } from "@/types/backend";
import { AiReanalysis } from "../AiReanalysis";

jest.mock("@/features/dashboards/dashboardAPI", () => ({
  usePostAnalyzeMutation: jest.fn(),
  useGetAiAnalysisQuery: jest.fn(),
}));

import {
  useGetAiAnalysisQuery,
  usePostAnalyzeMutation,
} from "@/features/dashboards/dashboardAPI";

const mockedUsePostAnalyzeMutation = usePostAnalyzeMutation as jest.Mock;
const mockedUseGetAiAnalysisQuery = useGetAiAnalysisQuery as jest.Mock;

function makeAnomaly(overrides: Partial<Anomaly> = {}): Anomaly {
  return {
    id: "M-109-2026-09-12T14:00:00Z",
    meter_id: "M-109",
    detected_at: "2026-09-12T14:00:00Z",
    type: "REAL_ANOMALY",
    severity: "HIGH",
    confidence: 0.97,
    reason: "Consumption spike",
    recommended_action: "Inspect the meter",
    status: "unexplained",
    priority: 1,
    baseline: {
      mean: 52.16,
      stddev: 20.84,
      count: 336,
      voltage_mean: 219.38,
      current_mean: 238.82,
      power_factor_mean: 0.905,
    },
    consumption_change_pct: 125.28,
    voltage_change_pct: -2.71,
    current_change_pct: 111.16,
    power_factor_change_pct: -18.16,
    correlated_events: [],
    data_quality: { flagged: false, reason: "" },
    llm_analysis: "**Narrative lead line**\n\nConsumption far above baseline.",
    ...overrides,
  };
}

const result: AnalysisResult = {
  analysisId: "3f1c9d4e-uuid",
  status: "completed",
  anomalies: [
    makeAnomaly(),
    makeAnomaly({
      id: "M-112-2026-09-10T09:00:00Z",
      meter_id: "M-112",
      priority: 2,
      type: "DATA_QUALITY",
      llm_analysis: "Second narrative.",
    }),
  ],
};

const trigger = jest.fn();

function mockMutation(
  state: Partial<{
    isLoading: boolean;
    data: { analysisId: string } | undefined;
    error: unknown;
  }> = {},
): void {
  mockedUsePostAnalyzeMutation.mockReturnValue([
    trigger,
    {
      isLoading: false,
      data: undefined,
      error: undefined,
      reset: jest.fn(),
      ...state,
    },
  ]);
}

function mockQuery(
  state: Partial<{
    data: AnalysisResult | undefined;
    error: unknown;
    isLoading: boolean;
  }> = {},
): void {
  mockedUseGetAiAnalysisQuery.mockReturnValue({
    data: undefined,
    error: undefined,
    isLoading: false,
    ...state,
  });
}

describe("AiReanalysis", () => {
  beforeEach(() => {
    mockedUsePostAnalyzeMutation.mockReset();
    mockedUseGetAiAnalysisQuery.mockReset();
    trigger.mockReset();
    mockMutation();
    mockQuery();
  });

  it("renders the labelled control and the latency disclosure while idle", () => {
    render(<AiReanalysis />);

    expect(
      screen.getByRole("region", { name: "Análisis con IA" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reintentar el análisis de la plataforma" }),
    ).toBeEnabled();
    expect(screen.getByText(/alrededor de un minuto/i)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("triggers the analysis request when the action is clicked", () => {
    render(<AiReanalysis />);

    fireEvent.click(
      screen.getByRole("button", { name: "Reintentar el análisis de la plataforma" }),
    );

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it("disables the action and announces the running state while pending", () => {
    mockMutation({ isLoading: true });

    render(<AiReanalysis />);

    expect(
      screen.getByRole("button", { name: /Reintentar el análisis de la plataforma/ }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "El análisis está en curso. Puede tardar alrededor de un minuto.",
    );
  });

  it("renders the mutation error and leaves the action usable to retry", () => {
    mockMutation({ error: { message: "Boom" } });

    render(<AiReanalysis />);

    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    expect(
      screen.getByRole("button", { name: "Reintentar el análisis de la plataforma" }),
    ).toBeEnabled();
  });

  it("falls back to a generic message when the mutation error has none", () => {
    mockMutation({ error: {} });

    render(<AiReanalysis />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo completar el análisis de la plataforma. Inténtalo de nuevo.",
    );
  });

  it("renders the analysis query error", () => {
    mockMutation({ data: { analysisId: "3f1c9d4e-uuid" } });
    mockQuery({ error: { message: "Nope" } });

    render(<AiReanalysis />);

    expect(screen.getByRole("alert")).toHaveTextContent("Nope");
  });

  it("renders the count, the top-priority link and its narrative on success", () => {
    mockMutation({ data: { analysisId: "3f1c9d4e-uuid" } });
    mockQuery({ data: result });

    render(<AiReanalysis />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Análisis completado: se devolvieron 2 anomalías.",
    );
    // The API already orders by ascending priority, so the first entry is the
    // most urgent. The component only reads it, never re-sorts.
    expect(screen.getByText("Anomalía más urgente")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "M-109-2026-09-12T14:00:00Z" }),
    ).toHaveAttribute(
      "href",
      `/anomalies/${encodeURIComponent("M-109-2026-09-12T14:00:00Z")}`,
    );
    expect(
      screen.getByText("Consumption far above baseline."),
    ).toBeInTheDocument();
  });

  it("renders an honest completion state when no anomalies are returned", () => {
    mockMutation({ data: { analysisId: "3f1c9d4e-uuid" } });
    mockQuery({ data: { ...result, anomalies: [] } });

    render(<AiReanalysis />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Análisis completado: no se devolvió ninguna anomalía.",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

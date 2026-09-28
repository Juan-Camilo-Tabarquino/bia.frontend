import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Anomaly, AnalysisResult } from "@/types/backend";
import { AiReanalysis } from "../AiReanalysis";

jest.mock("@/features/dashboards/dashboardAPI", () => ({
  // The component also imports the poll interval constant, the stage list and
  // the pending-status helper from that module, so the factory must keep the
  // real exports and replace only the two hooks that need a store provider.
  ...jest.requireActual("@/features/dashboards/dashboardAPI"),
  usePostAnalyzeMutation: jest.fn(),
  useGetAiAnalysisQuery: jest.fn(),
}));

import {
  ANALYSIS_POLL_INTERVAL_MS,
  useGetAiAnalysisQuery,
  usePostAnalyzeMutation,
} from "@/features/dashboards/dashboardAPI";

const mockedUsePostAnalyzeMutation = usePostAnalyzeMutation as jest.Mock;
const mockedUseGetAiAnalysisQuery = useGetAiAnalysisQuery as jest.Mock;

/** Meter the block is scoped to across this suite. */
const METER_ID = "M-109";

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
  meter_id: METER_ID,
  status: "completed",
  stage: "completed",
  progress: { done: 7, total: 7 },
  started_at: "2026-09-12T14:00:00Z",
  finished_at: "2026-09-12T14:01:00Z",
  anomalies: [
    makeAnomaly(),
    makeAnomaly({
      id: "M-109-2026-09-10T09:00:00Z",
      priority: 2,
      type: "DATA_QUALITY",
      llm_analysis: "Second narrative.",
    }),
  ],
  platform: { total_anomalies: 4, high_priority: 2 },
  error: null,
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

function renderBlock(): void {
  render(<AiReanalysis meterId={METER_ID} />);
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
    renderBlock();

    expect(
      screen.getByRole("region", { name: "Análisis con IA" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Correr análisis con IA" }),
    ).toBeEnabled();
    expect(screen.getByText(/alrededor de un minuto/i)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders the seven real pipeline stages in order", () => {
    renderBlock();

    const titles = screen
      .getAllByText(/^(Lecturas|Baseline|Detección|Correlación|Eventos|Explicación con IA|Recomendación)$/)
      .map((node) => node.textContent);

    // The expected order is written out literally on purpose: comparing against
    // ANALYSIS_STAGES, which the component itself renders from, would move both
    // sides together and still pass if two stages were swapped.
    expect(titles).toEqual([
      "Lecturas",
      "Baseline",
      "Detección",
      "Correlación",
      "Eventos",
      "Explicación con IA",
      "Recomendación",
    ]);
  });

  it("sends the meter id in the POST body when the action is clicked", () => {
    renderBlock();

    fireEvent.click(
      screen.getByRole("button", { name: "Correr análisis con IA" }),
    );

    expect(trigger).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveBeenCalledWith({ meterId: METER_ID });
  });

  it("disables the action and announces the running state while pending", () => {
    mockMutation({ isLoading: true });

    renderBlock();

    expect(
      screen.getByRole("button", { name: /Correr análisis con IA/ }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "El análisis está en curso. Puede tardar alrededor de un minuto.",
    );
  });

  it("renders the mutation error and leaves the action usable to retry", () => {
    mockMutation({ error: { message: "Boom" } });

    renderBlock();

    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    expect(
      screen.getByRole("button", { name: "Correr análisis con IA" }),
    ).toBeEnabled();
  });

  it("shows the error body of a rejected POST (unknown meter)", () => {
    // RTK Query exposes the JSON body under `data`; a `400 {"error":"…"}` must
    // surface that string instead of the generic fallback.
    mockMutation({ error: { status: 400, data: { error: "meter desconocido" } } });

    renderBlock();

    expect(screen.getByRole("alert")).toHaveTextContent("meter desconocido");
  });

  it("falls back to a generic message when the mutation error has none", () => {
    mockMutation({ error: {} });

    renderBlock();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo completar el análisis del medidor. Inténtalo de nuevo.",
    );
  });

  it("renders the analysis query error", () => {
    mockMutation({ data: { analysisId: "3f1c9d4e-uuid" } });
    mockQuery({ error: { message: "Nope" } });

    renderBlock();

    expect(screen.getByRole("alert")).toHaveTextContent("Nope");
  });

  it("renders the count, the top-priority link and its narrative on success", () => {
    mockMutation({ data: { analysisId: "3f1c9d4e-uuid" } });
    mockQuery({ data: result });

    renderBlock();

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
    // The recommended action and the platform closing line come from the result.
    expect(screen.getByText("Inspect the meter")).toBeInTheDocument();
    expect(
      screen.getByText("4 anomalías detectadas · 2 requieren atención prioritaria"),
    ).toBeInTheDocument();
  });

  it("renders an honest completion state when no anomalies are returned", () => {
    mockMutation({ data: { analysisId: "3f1c9d4e-uuid" } });
    mockQuery({ data: { ...result, anomalies: [] } });

    renderBlock();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Análisis completado: no se devolvió ninguna anomalía.",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("AiReanalysis status handling", () => {
  const analysisId = "3f1c9d4e-uuid";

  beforeEach(() => {
    mockedUsePostAnalyzeMutation.mockReset();
    mockedUseGetAiAnalysisQuery.mockReset();
    mockMutation({ data: { analysisId } });
  });

  function renderBlock(): void {
    render(<AiReanalysis meterId={METER_ID} />);
  }

  function button(): HTMLElement {
    return screen.getByRole("button", { name: "Correr análisis con IA" });
  }

  it("reports a queued analysis as in progress, never as a completed one", () => {
    mockQuery({
      data: { ...result, status: "queued", stage: "queued", progress: { done: 0, total: 7 } },
    });

    renderBlock();

    expect(screen.getByRole("status")).toHaveTextContent(
      "El análisis sigue en curso (estado: queued). Se actualizará automáticamente.",
    );
    // A non-terminal status is never announced as a finished analysis.
    expect(screen.queryByText(/Análisis completado/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // A second analysis must not be spinnable on top of the first.
    expect(button()).toBeDisabled();
  });

  it("marks the active stage and shows elapsed seconds while running", () => {
    mockQuery({
      data: {
        ...result,
        status: "running",
        stage: "explicacion",
        progress: { done: 5, total: 7 },
        finished_at: null,
      },
    });

    renderBlock();

    expect(screen.getByRole("status")).toHaveTextContent(
      "El análisis sigue en curso (estado: running). Se actualizará automáticamente.",
    );
    expect(button()).toBeDisabled();
    expect(mockedUseGetAiAnalysisQuery).toHaveBeenLastCalledWith(analysisId, {
      skip: false,
      pollingInterval: ANALYSIS_POLL_INTERVAL_MS,
    });
    // The active stage carries the live seconds counter; no fake percentage.
    expect(screen.getByText(/^Explicación con IA — \d+ s$/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("stops polling and re-enables the action once the status is completed", () => {
    mockQuery({ data: result });

    renderBlock();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Análisis completado: se devolvieron 2 anomalías.",
    );
    expect(mockedUseGetAiAnalysisQuery).toHaveBeenLastCalledWith(analysisId, {
      skip: false,
      pollingInterval: 0,
    });
    expect(button()).toBeEnabled();
  });

  it("surfaces a failed status as an error with the backend reason", () => {
    mockQuery({
      data: {
        ...result,
        status: "failed",
        stage: "failed",
        progress: { done: 5, total: 7 },
        error: "LLM provider timeout",
      },
    });

    renderBlock();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("ant-alert-error");
    expect(alert).toHaveTextContent("El análisis falló");
    expect(alert).toHaveTextContent("LLM provider timeout");
    expect(screen.queryByText(/Análisis completado/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(mockedUseGetAiAnalysisQuery).toHaveBeenLastCalledWith(analysisId, {
      skip: false,
      pollingInterval: 0,
    });
  });

  it("warns and stops polling on a status the interface does not recognise", () => {
    // The guard for the allow-list safety property: `processing` is not one of
    // the two non-terminal statuses, so the query must not keep asking forever,
    // and the payload must never be read as a finished analysis.
    mockQuery({ data: { ...result, status: "processing" } });

    renderBlock();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("ant-alert-warning");
    expect(alert).toHaveTextContent("Estado del análisis no reconocido");
    expect(alert).toHaveTextContent(
      'El análisis devolvió el estado "processing", que esta interfaz no reconoce. No se puede confirmar que haya terminado.',
    );
    expect(screen.queryByText(/Análisis completado/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(mockedUseGetAiAnalysisQuery).toHaveBeenLastCalledWith(analysisId, {
      skip: false,
      pollingInterval: 0,
    });
  });

  it("marks no step finished when the status is not recognised", () => {
    // Regression guard for the steps: an unrecognised payload can still carry
    // `stage: "completed"`, and seven finished steps next to the warning that
    // completion cannot be confirmed would contradict each other.
    mockQuery({ data: { ...result, status: "processing" } });

    renderBlock();

    expect(document.querySelectorAll(".ant-steps-item-finish")).toHaveLength(0);
  });

  it("stops polling once a pending analysis reports a terminal status", () => {
    // Triangulation of the interval itself: the `completed` test above starts
    // from a terminal status, so only this one exercises the pending -> terminal
    // transition that has to turn the interval back to 0 for good.
    mockQuery({
      data: { ...result, status: "queued", stage: "queued", progress: { done: 0, total: 7 } },
    });
    const { rerender } = render(<AiReanalysis meterId={METER_ID} />);

    expect(mockedUseGetAiAnalysisQuery).toHaveBeenLastCalledWith(analysisId, {
      skip: false,
      pollingInterval: ANALYSIS_POLL_INTERVAL_MS,
    });

    mockQuery({ data: result });
    rerender(<AiReanalysis meterId={METER_ID} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Análisis completado: se devolvieron 2 anomalías.",
    );
    expect(mockedUseGetAiAnalysisQuery).toHaveBeenLastCalledWith(analysisId, {
      skip: false,
      pollingInterval: 0,
    });
    expect(button()).toBeEnabled();
  });
});

import React from "react";
import { render, screen } from "@testing-library/react";
import type { Anomaly } from "@/types/backend";
import { formatDateTime } from "@/components/formatters";
import { AnomalyDetail } from "../AnomalyDetail";

function makeAnomaly(overrides: Partial<Anomaly> = {}): Anomaly {
  return {
    id: "M-109-2026-09-12T14:00:00Z",
    meter_id: "M-109",
    detected_at: "2026-09-12T14:00:00Z",
    type: "REAL_ANOMALY",
    severity: "HIGH",
    confidence: 0.97,
    reason: "Consumption jumped 240% over the baseline window.",
    recommended_action: "Dispatch a technician to inspect the meter.",
    status: "unexplained",
    priority: 1,
    baseline: {
      mean: 52.16083333333332,
      stddev: 20.8447416159286,
      count: 336,
      voltage_mean: 219.3816071428571,
      current_mean: 238.8183035714285,
      power_factor_mean: 0.9054226190476188,
    },
    consumption_change_pct: 125.28397744156703,
    voltage_change_pct: -2.7129016057310187,
    current_change_pct: 111.16053185980832,
    power_factor_change_pct: -18.159764908520728,
    correlated_events: [],
    data_quality: { flagged: false, reason: "" },
    ...overrides,
  };
}

describe("AnomalyDetail", () => {
  it("renders every deterministic DTO field", () => {
    render(<AnomalyDetail anomaly={makeAnomaly()} />);

    expect(screen.getByText("M-109-2026-09-12T14:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("M-109")).toBeInTheDocument();
    // `detected_at` is the date field, so it goes through the shared formatter;
    // the id above only happens to embed a timestamp and stays verbatim.
    expect(
      screen.getByText(formatDateTime("2026-09-12T14:00:00Z")),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("2026-09-12T14:00:00Z"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("REAL_ANOMALY")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("97%")).toBeInTheDocument();
    expect(screen.getByText("Sin explicación")).toBeInTheDocument();
    expect(
      screen.getByText("Consumption jumped 240% over the baseline window."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Dispatch a technician to inspect the meter."),
    ).toBeInTheDocument();
  });

  it("links the meter id to its meter detail route", () => {
    render(<AnomalyDetail anomaly={makeAnomaly()} />);

    // The link text is the meter id verbatim, so the target is not hidden.
    expect(screen.getByRole("link", { name: "M-109" })).toHaveAttribute(
      "href",
      "/meter/M-109",
    );
  });

  it("encodes a meter id with reserved characters the same way the reverse link does", () => {
    // `MeterId` is a bare string, so a reserved character is possible even
    // though the seeded ids are `M-<digits>`. This is the exact encoding
    // `MeterDetail` applies to its anomaly link.
    render(<AnomalyDetail anomaly={makeAnomaly({ meter_id: "M 109/A" })} />);

    expect(screen.getByRole("link", { name: "M 109/A" })).toHaveAttribute(
      "href",
      "/meter/M%20109%2FA",
    );
  });

  it("presents the recommended action as the conclusion and status as the causal reading", () => {
    render(<AnomalyDetail anomaly={makeAnomaly()} />);

    expect(screen.getByText("Acción / conclusión")).toBeInTheDocument();
    expect(screen.getByText("Lectura causal")).toBeInTheDocument();
    expect(
      screen.getByText(/no encontró una explicación correlacionada/i),
    ).toBeInTheDocument();
  });

  it("reads an explained status as correlated", () => {
    render(<AnomalyDetail anomaly={makeAnomaly({ status: "explained" })} />);

    expect(
      screen.getByText(/correlacionó esta anomalía con una explicación/i),
    ).toBeInTheDocument();
  });

  it("calls out DATA_QUALITY as a measurement problem", () => {
    render(<AnomalyDetail anomaly={makeAnomaly({ type: "DATA_QUALITY" })} />);

    expect(screen.getByText("DATA_QUALITY")).toBeInTheDocument();
    expect(
      screen.getAllByText("Problema de calidad de datos").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/no es una anomalía real de consumo/i),
    ).toBeInTheDocument();
  });

  it("renders the optional LLM narrative as markdown, additive to the deterministic fields", () => {
    render(
      <AnomalyDetail
        anomaly={makeAnomaly({
          llm_analysis: [
            "**Análisis de la anomalía eléctrica – M-109**",
            "",
            "## Hallazgos",
            "",
            "| Parámetro | Valor |",
            "| --- | --- |",
            "| Consumo | +240% |",
          ].join("\n"),
        })}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Narrativa del LLM" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Hallazgos" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "+240%" })).toBeInTheDocument();
    // The deterministic fields stay visible next to the narrative.
    expect(
      screen.getByText("Consumption jumped 240% over the baseline window."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Dispatch a technician to inspect the meter."),
    ).toBeInTheDocument();
  });

  it("shows an honest empty state when the backend omits llm_analysis", () => {
    render(<AnomalyDetail anomaly={makeAnomaly()} />);

    expect(
      screen.getByText(
        "No hay narrativa del LLM disponible para esta anomalía.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps reason and recommended_action as plain text, never markdown", () => {
    render(
      <AnomalyDetail
        anomaly={makeAnomaly({
          reason: "**not bold**",
          recommended_action: "# not a heading",
        })}
      />,
    );

    expect(screen.getByText("**not bold**")).toBeInTheDocument();
    expect(screen.getByText("# not a heading")).toBeInTheDocument();
  });

  it("renders the API priority value", () => {
    render(<AnomalyDetail anomaly={makeAnomaly({ priority: 3 })} />);

    expect(screen.getByText("Prioridad")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders the baseline statistics behind the anomaly", () => {
    render(<AnomalyDetail anomaly={makeAnomaly()} />);

    expect(screen.getByText("Línea base")).toBeInTheDocument();
    expect(screen.getByText("52.16")).toBeInTheDocument();
    expect(screen.getByText("20.84")).toBeInTheDocument();
    expect(screen.getByText("336")).toBeInTheDocument();
    expect(screen.getByText("219.38")).toBeInTheDocument();
    expect(screen.getByText("238.82")).toBeInTheDocument();
    expect(screen.getByText("0.905")).toBeInTheDocument();
  });

  it("renders each per-signal change percentage with its sign", () => {
    render(<AnomalyDetail anomaly={makeAnomaly()} />);

    expect(screen.getByText("Cambio vs. la línea base")).toBeInTheDocument();
    expect(screen.getByText("+125.3%")).toBeInTheDocument();
    expect(screen.getByText("-2.7%")).toBeInTheDocument();
    expect(screen.getByText("+111.2%")).toBeInTheDocument();
    expect(screen.getByText("-18.2%")).toBeInTheDocument();
  });

  it("lists the correlated events that explain the deviation", () => {
    render(
      <AnomalyDetail
        anomaly={makeAnomaly({
          correlated_events: [
            {
              id: "M-104",
              type: "OPERATIONAL_CHANGE",
              start: "2026-09-11T00:00:00Z",
              end: "2026-09-11T06:00:00Z",
              description: "New production line activated",
            },
          ],
        })}
      />,
    );

    expect(screen.getByLabelText("Eventos correlacionados")).toBeInTheDocument();
    expect(screen.getByText("OPERATIONAL_CHANGE")).toBeInTheDocument();
    expect(
      screen.getByText(
        `${formatDateTime("2026-09-11T00:00:00Z")} – ${formatDateTime("2026-09-11T06:00:00Z")}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("2026-09-11T00:00:00Z – 2026-09-11T06:00:00Z"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("New production line activated"),
    ).toBeInTheDocument();
  });

  it("states explicitly when no correlated event explains the deviation", () => {
    render(<AnomalyDetail anomaly={makeAnomaly({ correlated_events: [] })} />);

    expect(
      screen.getByText(/Ningún evento correlacionado explica esta desviación/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Eventos correlacionados"),
    ).not.toBeInTheDocument();
  });

  it("shows the data-quality flag and its reason when flagged", () => {
    render(
      <AnomalyDetail
        anomaly={makeAnomaly({
          type: "DATA_QUALITY",
          data_quality: {
            flagged: true,
            reason: "power factor 0.720 below 0.85",
          },
        })}
      />,
    );

    expect(screen.getByText("Marcado")).toBeInTheDocument();
    expect(screen.getByText("Sí")).toBeInTheDocument();
    expect(
      screen.getByText("power factor 0.720 below 0.85"),
    ).toBeInTheDocument();
  });

  it("states that nothing was flagged when data_quality is clear", () => {
    render(
      <AnomalyDetail
        anomaly={makeAnomaly({ data_quality: { flagged: false, reason: "" } })}
      />,
    );

    expect(screen.getByText("No")).toBeInTheDocument();
    expect(
      screen.getByText(/No se marcó ningún problema de calidad de datos/i),
    ).toBeInTheDocument();
  });
});

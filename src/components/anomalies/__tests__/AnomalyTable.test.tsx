import React from "react";
import { render, screen } from "@testing-library/react";
import type { Anomaly } from "@/types/backend";
import { AnomalyTable } from "../AnomalyTable";

const realAnomaly: Anomaly = {
  id: "M-109-2026-09-12T14:00:00Z",
  meter_id: "M-109",
  detected_at: "2026-09-12T14:00:00Z",
  type: "REAL_ANOMALY",
  severity: "HIGH",
  confidence: 0.97,
  reason: "Sudden consumption spike",
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
};

const dataQualityAnomaly: Anomaly = {
  id: "M-112-2026-09-10T09:00:00Z",
  meter_id: "M-112",
  detected_at: "2026-09-10T09:00:00Z",
  type: "DATA_QUALITY",
  severity: "HIGH",
  confidence: 0.9,
  reason: "Missing readings",
  recommended_action: "Check the meter wiring",
  status: "explained",
  priority: 2,
  baseline: {
    mean: 27.55,
    stddev: 4.77,
    count: 336,
    voltage_mean: 221.1,
    current_mean: 125.54,
    power_factor_mean: 0.94,
  },
  consumption_change_pct: -26.42,
  voltage_change_pct: 8.43,
  current_change_pct: 28.78,
  power_factor_change_pct: -23.38,
  correlated_events: [
    {
      id: "M-112",
      type: "DATA_QUALITY",
      start: "2026-09-13T00:00:00Z",
      end: "2026-09-13T00:00:00Z",
      description: "Intermittent readings and abnormal electrical jumps",
    },
  ],
  data_quality: { flagged: true, reason: "power factor 0.720 below 0.85" },
};

describe("AnomalyTable", () => {
  it("renders every required field for each anomaly", () => {
    render(<AnomalyTable anomalies={[realAnomaly]} />);

    expect(
      screen.getByRole("link", { name: realAnomaly.id }),
    ).toHaveAttribute("href", `/anomalies/${realAnomaly.id}`);
    expect(screen.getByText("M-109")).toBeInTheDocument();
    expect(screen.getByText("2026-09-12T14:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("REAL_ANOMALY")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("97%")).toBeInTheDocument();
    expect(screen.getByText("Unexplained")).toBeInTheDocument();
  });

  it("shows the API priority value in a Priority column", () => {
    render(<AnomalyTable anomalies={[realAnomaly, dataQualityAnomaly]} />);

    expect(
      screen.getByRole("columnheader", { name: "Priority" }),
    ).toBeInTheDocument();
    // The values are the API numbers, shown verbatim.
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders DATA_QUALITY rows with a plain-language measurement label", () => {
    render(<AnomalyTable anomalies={[dataQualityAnomaly]} />);

    expect(screen.getByText("DATA_QUALITY")).toBeInTheDocument();
    expect(screen.getByText("Data quality issue")).toBeInTheDocument();
  });

  it("does not add the data-quality label to real anomalies", () => {
    render(<AnomalyTable anomalies={[realAnomaly]} />);

    expect(screen.queryByText("Data quality issue")).not.toBeInTheDocument();
  });

  it("marks the DATA_QUALITY row as visually distinct", () => {
    const { container } = render(
      <AnomalyTable anomalies={[realAnomaly, dataQualityAnomaly]} />,
    );

    const rows = Array.from(container.querySelectorAll("tbody tr"));
    const dataQualityRow = rows.find((row) =>
      row.textContent?.includes("M-112"),
    );

    expect(dataQualityRow?.className).toContain("dataQualityRow");
  });
});

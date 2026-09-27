import type { Anomaly } from "@/types/backend";
import {
  applyAnomalyFilters,
  emptyAnomalyFilters,
  type AnomalyFilterValues,
} from "../anomalyFiltering";

function makeAnomaly(overrides: Partial<Anomaly> & Pick<Anomaly, "id">): Anomaly {
  return {
    meter_id: "M-109",
    detected_at: "2026-09-12T14:00:00Z",
    type: "REAL_ANOMALY",
    severity: "HIGH",
    confidence: 0.97,
    reason: "reason",
    recommended_action: "action",
    status: "unexplained",
    priority: 1,
    baseline: {
      mean: 50,
      stddev: 10,
      count: 336,
      voltage_mean: 220,
      current_mean: 240,
      power_factor_mean: 0.9,
    },
    consumption_change_pct: 125.3,
    voltage_change_pct: -2.7,
    current_change_pct: 111.2,
    power_factor_change_pct: -18.2,
    correlated_events: [],
    data_quality: { flagged: false, reason: "" },
    ...overrides,
  };
}

const anomalies: Anomaly[] = [
  makeAnomaly({
    id: "M-109-2026-09-12T14:00:00Z",
    meter_id: "M-109",
    detected_at: "2026-09-12T14:00:00Z",
    type: "REAL_ANOMALY",
    severity: "HIGH",
    status: "unexplained",
    priority: 1,
  }),
  makeAnomaly({
    id: "M-112-2026-09-10T09:00:00Z",
    meter_id: "M-112",
    detected_at: "2026-09-10T09:00:00Z",
    type: "DATA_QUALITY",
    severity: "HIGH",
    status: "explained",
    priority: 2,
    data_quality: { flagged: true, reason: "power factor below 0.85" },
  }),
  makeAnomaly({
    id: "M-106-2026-09-01T00:00:00Z",
    meter_id: "M-106",
    detected_at: "2026-09-01T00:00:00Z",
    type: "FALSE_POSITIVE",
    severity: "LOW",
    status: "explained",
    priority: 4,
  }),
  makeAnomaly({
    id: "M-104-2026-08-20T00:00:00Z",
    meter_id: "M-104",
    detected_at: "2026-08-20T00:00:00Z",
    type: "EXPLAINABLE_ANOMALY",
    severity: "MEDIUM",
    status: "explained",
    priority: 3,
    correlated_events: [
      {
        id: "M-104",
        type: "OPERATIONAL_CHANGE",
        start: "2026-08-19T00:00:00Z",
        end: "2026-08-19T00:00:00Z",
        description: "New production line activated",
      },
    ],
  }),
];

function withFilters(partial: Partial<AnomalyFilterValues>): AnomalyFilterValues {
  return { ...emptyAnomalyFilters, ...partial };
}

const ids = (list: Anomaly[]): string[] => list.map((anomaly) => anomaly.id);

describe("applyAnomalyFilters", () => {
  it("returns every anomaly when no filter is active", () => {
    expect(applyAnomalyFilters(anomalies, emptyAnomalyFilters)).toHaveLength(4);
  });

  it("filters by meter_id", () => {
    expect(ids(applyAnomalyFilters(anomalies, withFilters({ meterId: "M-112" })))).toEqual([
      "M-112-2026-09-10T09:00:00Z",
    ]);
  });

  it("filters by type, keeping DATA_QUALITY distinguishable", () => {
    expect(ids(applyAnomalyFilters(anomalies, withFilters({ type: "DATA_QUALITY" })))).toEqual([
      "M-112-2026-09-10T09:00:00Z",
    ]);
  });

  it("filters by severity", () => {
    expect(ids(applyAnomalyFilters(anomalies, withFilters({ severity: "HIGH" })))).toEqual([
      "M-109-2026-09-12T14:00:00Z",
      "M-112-2026-09-10T09:00:00Z",
    ]);
  });

  it("filters by status", () => {
    expect(ids(applyAnomalyFilters(anomalies, withFilters({ status: "unexplained" })))).toEqual([
      "M-109-2026-09-12T14:00:00Z",
    ]);
  });

  it("applies an inclusive detected_at date range", () => {
    const filtered = applyAnomalyFilters(
      anomalies,
      withFilters({
        detectedFrom: "2026-09-10T00:00:00.000Z",
        detectedTo: "2026-09-12T23:59:59.999Z",
      }),
    );

    expect(ids(filtered)).toEqual([
      "M-109-2026-09-12T14:00:00Z",
      "M-112-2026-09-10T09:00:00Z",
    ]);
  });

  it("combines several filters with AND semantics", () => {
    const filtered = applyAnomalyFilters(
      anomalies,
      withFilters({ severity: "HIGH", status: "explained" }),
    );

    expect(ids(filtered)).toEqual(["M-112-2026-09-10T09:00:00Z"]);
  });
});

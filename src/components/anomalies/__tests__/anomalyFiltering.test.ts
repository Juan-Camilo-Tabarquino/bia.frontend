import type { Anomaly } from "@/types/backend";
import {
  applyAnomalyFilters,
  applyAnomalySort,
  emptyAnomalyFilters,
  hasActiveFilters,
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

describe("hasActiveFilters", () => {
  it("is false for the empty filter set", () => {
    expect(hasActiveFilters(emptyAnomalyFilters)).toBe(false);
  });

  it("is true when any filter is set", () => {
    expect(hasActiveFilters(withFilters({ type: "DATA_QUALITY" }))).toBe(true);
  });
});

describe("applyAnomalySort", () => {
  it("returns the original array, untouched, for the API (priority) order", () => {
    expect(applyAnomalySort(anomalies, "backend")).toBe(anomalies);
  });

  it("sorts by the API priority field, most urgent first", () => {
    // The stored array is deliberately not in priority order (M-106 comes
    // before M-104), so this assertion proves the sort reads `priority`.
    expect(ids(applyAnomalySort(anomalies, "priority"))).toEqual([
      "M-109-2026-09-12T14:00:00Z",
      "M-112-2026-09-10T09:00:00Z",
      "M-104-2026-08-20T00:00:00Z",
      "M-106-2026-09-01T00:00:00Z",
    ]);
  });

  it("breaks priority ties by detected_at and then meter_id", () => {
    const tied: Anomaly[] = [
      makeAnomaly({
        id: "B-2026-09-02T00:00:00Z",
        meter_id: "M-202",
        detected_at: "2026-09-02T00:00:00Z",
        priority: 5,
      }),
      makeAnomaly({
        id: "A-2026-09-01T00:00:00Z",
        meter_id: "M-201",
        detected_at: "2026-09-01T00:00:00Z",
        priority: 5,
      }),
    ];

    expect(ids(applyAnomalySort(tied, "priority"))).toEqual([
      "A-2026-09-01T00:00:00Z",
      "B-2026-09-02T00:00:00Z",
    ]);
  });

  it("sorts by severity from high to low", () => {
    expect(ids(applyAnomalySort(anomalies, "severity"))).toEqual([
      "M-109-2026-09-12T14:00:00Z",
      "M-112-2026-09-10T09:00:00Z",
      "M-104-2026-08-20T00:00:00Z",
      "M-106-2026-09-01T00:00:00Z",
    ]);
  });

  it("sorts by detected_at with the newest first", () => {
    expect(ids(applyAnomalySort(anomalies, "detected_at"))).toEqual([
      "M-109-2026-09-12T14:00:00Z",
      "M-112-2026-09-10T09:00:00Z",
      "M-106-2026-09-01T00:00:00Z",
      "M-104-2026-08-20T00:00:00Z",
    ]);
  });

  it("does not mutate the source array", () => {
    const original = ids(anomalies);
    applyAnomalySort(anomalies, "severity");
    expect(ids(anomalies)).toEqual(original);
  });
});

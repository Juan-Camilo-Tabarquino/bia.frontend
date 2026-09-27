import type { Anomaly } from "@/types/backend";
import {
  anomalySortDefinitions,
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

describe("applyAnomalySort", () => {
  const reversed: Anomaly[] = [...anomalies].reverse();

  it("leaves the API order untouched for `backend`", () => {
    // Same array instance, so the default view cannot have been reordered.
    expect(applyAnomalySort(reversed, "backend")).toBe(reversed);
  });

  it("sorts by ascending priority with the backend tie-breakers", () => {
    expect(ids(applyAnomalySort(reversed, "priority"))).toEqual([
      "M-109-2026-09-12T14:00:00Z",
      "M-112-2026-09-10T09:00:00Z",
      "M-104-2026-08-20T00:00:00Z",
      "M-106-2026-09-01T00:00:00Z",
    ]);
  });

  it("sorts by severity from high to low", () => {
    // M-109 and M-112 are both HIGH in this fixture, so this also pins the tie
    // behaviour: equal severities keep the order they arrived in.
    expect(ids(applyAnomalySort(reversed, "severity"))).toEqual([
      "M-112-2026-09-10T09:00:00Z",
      "M-109-2026-09-12T14:00:00Z",
      "M-104-2026-08-20T00:00:00Z",
      "M-106-2026-09-01T00:00:00Z",
    ]);
  });

  it("sorts by detected_at newest first", () => {
    expect(ids(applyAnomalySort(reversed, "detected_at"))).toEqual([
      "M-109-2026-09-12T14:00:00Z",
      "M-112-2026-09-10T09:00:00Z",
      "M-106-2026-09-01T00:00:00Z",
      "M-104-2026-08-20T00:00:00Z",
    ]);
  });

  it("sorts by confidence highest first", () => {
    const byConfidence = [
      makeAnomaly({ id: "low", confidence: 0.2 }),
      makeAnomaly({ id: "high", confidence: 0.99 }),
      makeAnomaly({ id: "mid", confidence: 0.6 }),
    ];

    expect(ids(applyAnomalySort(byConfidence, "confidence"))).toEqual([
      "high",
      "mid",
      "low",
    ]);
  });

  it("does not mutate the array it is given", () => {
    const input = [...reversed];

    applyAnomalySort(input, "severity");

    expect(input).toEqual(reversed);
  });

  // The ordering produced here is invisible in the browser: `AnomalyTable`
  // hands the array to antd, whose controlled sorter re-sorts it, so a wrong
  // direction still renders the expected rows. These tests are the only guard
  // on this path, which is why they are direct rather than asserted through the
  // table.
  it("reproduces the registry's own comparison for every declared ordering", () => {
    const sample = [
      makeAnomaly({ id: "b", priority: 2, confidence: 0.5, severity: "LOW" }),
      makeAnomaly({ id: "a", priority: 1, confidence: 0.9, severity: "HIGH" }),
      makeAnomaly({ id: "c", priority: 3, confidence: 0.1, severity: "MEDIUM" }),
    ];

    for (const definition of anomalySortDefinitions) {
      const expected = [...sample].sort((left, right) => {
        const compared = definition.compare(left, right);
        return definition.direction === "ascend" ? compared : -compared;
      });

      expect({
        key: definition.key,
        order: ids(applyAnomalySort(sample, definition.key)),
      }).toEqual({ key: definition.key, order: ids(expected) });
    }
  });
});

/** Builds filters with a search term, so `hasActiveFilters` can be probed. */
function withSearch(text: string): AnomalyFilterValues {
  return { ...emptyAnomalyFilters, search: { text, resetToken: 0 } };
}

describe("hasActiveFilters and the search term", () => {
  // The search branch is what shows the "Filters are applied..." note and keeps
  // the clear action enabled for a search-only filter. Deleting that branch
  // used to leave the entire suite green, so it is pinned directly here rather
  // than only through the page.
  it("counts a non-blank search term as an active filter", () => {
    expect(hasActiveFilters(withSearch("spike"))).toBe(true);
  });

  it("counts a whitespace-only term as no filter, because it hides nothing", () => {
    expect(hasActiveFilters(withSearch("   "))).toBe(false);
  });

  it("counts an empty term as no filter", () => {
    expect(hasActiveFilters(withSearch(""))).toBe(false);
  });

  it("still reports the other filters when the term is blank", () => {
    expect(
      hasActiveFilters({ ...withSearch("  "), severity: "HIGH" }),
    ).toBe(true);
  });
});

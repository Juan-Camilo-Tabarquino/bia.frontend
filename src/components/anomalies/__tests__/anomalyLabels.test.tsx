import React from "react";
import { render, screen } from "@testing-library/react";
import type { Anomaly } from "@/types/backend";

import { AnomalyTable } from "../AnomalyTable";
import { AnomalyTypeTag } from "../AnomalyTypeTag";
import {
  anomalySeverities,
  anomalySeverityLabels,
  anomalyStatusLabels,
  anomalyStatuses,
  anomalyTypeLabels,
  anomalyTypes,
} from "../anomalyLabels";

/** A complete, valid anomaly so a table row can render for any enum member. */
function anomalyFor(overrides: Partial<Anomaly> = {}): Anomaly {
  return {
    id: "A-001",
    meter_id: "M-101",
    detected_at: "2024-01-01T00:00:00Z",
    type: "REAL_ANOMALY",
    severity: "HIGH",
    confidence: 0.9,
    reason: "reason",
    recommended_action: "action",
    status: "unexplained",
    priority: 1,
    baseline: {
      mean: 1,
      stddev: 1,
      count: 1,
      voltage_mean: 1,
      current_mean: 1,
      power_factor_mean: 1,
    },
    consumption_change_pct: 1,
    voltage_change_pct: 1,
    current_change_pct: 1,
    power_factor_change_pct: 1,
    correlated_events: [],
    data_quality: { flagged: false, reason: "" },
    ...overrides,
  };
}

/**
 * The three anomaly enum label maps, and their render sites.
 *
 * The point is exhaustiveness: every member of every enum must have its own
 * Spanish label AND that label must actually reach the screen, so a new enum
 * member (or a label that is missing or left in English) fails here instead of
 * leaking a raw wire value to the reader. The meter status map's render site is
 * `MeterDetail`, covered in its own suite.
 */
describe("anomaly label maps", () => {
  it("covers every AnomalyType, and AnomalyTypeTag renders each label", () => {
    expect(Object.keys(anomalyTypeLabels).sort()).toEqual(
      [...anomalyTypes].sort(),
    );

    for (const type of anomalyTypes) {
      const { unmount } = render(<AnomalyTypeTag type={type} />);
      // The raw wire value stays visible next to the label.
      expect(screen.getByText(type)).toBeInTheDocument();
      expect(screen.getByText(anomalyTypeLabels[type])).toBeInTheDocument();
      unmount();
    }
  });

  it("covers every AnomalySeverity, and the table renders each label", () => {
    expect(Object.keys(anomalySeverityLabels).sort()).toEqual(
      [...anomalySeverities].sort(),
    );

    for (const severity of anomalySeverities) {
      const { unmount } = render(
        <AnomalyTable anomalies={[anomalyFor({ severity })]} />,
      );
      expect(screen.getByText(severity)).toBeInTheDocument();
      expect(screen.getByText(anomalySeverityLabels[severity])).toBeInTheDocument();
      unmount();
    }
  });

  it("covers every AnomalyStatus, and the table renders each label", () => {
    expect(Object.keys(anomalyStatusLabels).sort()).toEqual(
      [...anomalyStatuses].sort(),
    );

    for (const status of anomalyStatuses) {
      const { unmount } = render(
        <AnomalyTable anomalies={[anomalyFor({ status })]} />,
      );
      expect(screen.getByText(anomalyStatusLabels[status])).toBeInTheDocument();
      unmount();
    }
  });

  it("keeps every label distinct from its raw enum value", () => {
    // A label equal to the wire value would mean an untranslated enum leaked
    // through, which is exactly what these maps exist to prevent.
    for (const type of anomalyTypes) {
      expect(anomalyTypeLabels[type]).not.toBe(type);
    }
    for (const severity of anomalySeverities) {
      expect(anomalySeverityLabels[severity]).not.toBe(severity);
    }
    for (const status of anomalyStatuses) {
      expect(anomalyStatusLabels[status]).not.toBe(status);
    }
  });
});

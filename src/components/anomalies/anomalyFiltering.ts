import type {
  Anomaly,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyType,
} from "@/types/backend";
import { severityRank } from "./anomalyLabels";

/**
 * Client-side list handling for `GET /api/anomalies`.
 *
 * The backend returns a **bare array already ordered by ascending `priority`**
 * (then `detected_at`, then `meter_id`) and the endpoint accepts **no query
 * parameters**, so every filter and the sort selector below run in the browser
 * over the already-fetched list. There is deliberately no attempt to proxy this
 * as server-side filtering: the page refetches nothing when the user changes a
 * control, and the default view keeps the API order untouched.
 */

export interface AnomalyFilterValues {
  meterId: string | null;
  type: AnomalyType | null;
  severity: AnomalySeverity | null;
  status: AnomalyStatus | null;
  /** Inclusive lower bound, RFC3339 (start of the selected day). */
  detectedFrom: string | null;
  /** Inclusive upper bound, RFC3339 (end of the selected day). */
  detectedTo: string | null;
}

export const emptyAnomalyFilters: AnomalyFilterValues = {
  meterId: null,
  type: null,
  severity: null,
  status: null,
  detectedFrom: null,
  detectedTo: null,
};

export function hasActiveFilters(filters: AnomalyFilterValues): boolean {
  return (
    filters.meterId !== null ||
    filters.type !== null ||
    filters.severity !== null ||
    filters.status !== null ||
    filters.detectedFrom !== null ||
    filters.detectedTo !== null
  );
}

export type AnomalySortKey = "backend" | "priority" | "severity" | "detected_at";

export interface AnomalySortOption {
  value: AnomalySortKey;
  label: string;
}

/**
 * Explicitly labelled as a browser-side sort of the fetched array: the default
 * "Priority (API order)" leaves the response array untouched, because the
 * backend now returns it in ascending `priority` order.
 */
export const anomalySortOptions: AnomalySortOption[] = [
  { value: "backend", label: "Priority (API order)" },
  { value: "priority", label: "UI sort: priority (most urgent first)" },
  { value: "severity", label: "UI sort: severity (high to low)" },
  { value: "detected_at", label: "UI sort: detected at (newest first)" },
];

/** Returns a new array with only the anomalies matching every active filter. */
export function applyAnomalyFilters(
  anomalies: Anomaly[],
  filters: AnomalyFilterValues,
): Anomaly[] {
  return anomalies.filter((anomaly) => {
    if (filters.meterId !== null && anomaly.meter_id !== filters.meterId) {
      return false;
    }
    if (filters.type !== null && anomaly.type !== filters.type) {
      return false;
    }
    if (filters.severity !== null && anomaly.severity !== filters.severity) {
      return false;
    }
    if (filters.status !== null && anomaly.status !== filters.status) {
      return false;
    }

    const detectedAt = Date.parse(anomaly.detected_at);

    if (filters.detectedFrom !== null) {
      const from = Date.parse(filters.detectedFrom);
      if (
        !Number.isNaN(from) &&
        (Number.isNaN(detectedAt) || detectedAt < from)
      ) {
        return false;
      }
    }
    if (filters.detectedTo !== null) {
      const to = Date.parse(filters.detectedTo);
      if (!Number.isNaN(to) && (Number.isNaN(detectedAt) || detectedAt > to)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Applies the user-selected UI sort. `"backend"` returns the original array so
 * the default view keeps the exact order the API returned, which is already
 * ascending `priority`. `"priority"` re-sorts on the API-provided `priority`
 * field only (never a client re-derivation), with the same deterministic
 * tie-breakers the backend uses.
 */
export function applyAnomalySort(
  anomalies: Anomaly[],
  sortKey: AnomalySortKey,
): Anomaly[] {
  if (sortKey === "backend") {
    return anomalies;
  }

  const sorted = [...anomalies];
  if (sortKey === "priority") {
    sorted.sort((left, right) =>
      left.priority - right.priority ||
      Date.parse(left.detected_at) - Date.parse(right.detected_at) ||
      left.meter_id.localeCompare(right.meter_id),
    );
  } else if (sortKey === "severity") {
    sorted.sort(
      (left, right) => severityRank[left.severity] - severityRank[right.severity],
    );
  } else {
    sorted.sort(
      (left, right) =>
        Date.parse(right.detected_at) - Date.parse(left.detected_at),
    );
  }
  return sorted;
}

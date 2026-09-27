import type {
  Anomaly,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyType,
} from "@/types/backend";
import type { UrlStateSchema } from "@/hooks/useUrlState";
import {
  anomalySeverities,
  anomalyStatuses,
  anomalyTypes,
  severityRank,
} from "./anomalyLabels";

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

/* ------------------------------------------------------------------ *
 * URL serialization
 *
 * `applyAnomalyFilters` / `applyAnomalySort` above remain the single source of
 * truth for what a filter or a sort *means*; the schema below only describes
 * how that state travels through the query string, so a refresh or a shared
 * link restores the exact same view. No value is ever sent to the backend:
 * `GET /api/anomalies` takes no query parameters and accepts none.
 * ------------------------------------------------------------------ */

/** The complete deep-linkable view: the filters plus the sort key. */
export type AnomalyUrlState = AnomalyFilterValues & { sort: AnomalySortKey };

/**
 * Every sort key the UI knows, used to reject unknown `sort` values.
 *
 * Derived from `anomalySortOptions` rather than re-listed, so the selector the
 * user sees and the parser that accepts a deep link can never disagree: adding
 * an option without teaching the URL about it would offer a choice the link
 * silently discards.
 */
export const anomalySortKeys: readonly AnomalySortKey[] =
  anomalySortOptions.map((option) => option.value);

/**
 * Parses a raw parameter against the enum values the UI can actually render.
 * An unknown value yields `undefined`, so the URL layer falls back to the
 * declared default and the bogus value is never treated as active state.
 */
function parseEnumValue<Value extends string>(
  allowed: readonly Value[],
): (raw: string) => Value | undefined {
  return (raw) =>
    (allowed as readonly string[]).includes(raw) ? (raw as Value) : undefined;
}

/** A filter that is off serializes to `null`, which drops the parameter. */
function serializeOptionalFilter(value: string | null): string | null {
  return value;
}

/** Only parses the way the filter itself parses, so the URL agrees with it. */
function parseDateFilter(raw: string): string | undefined {
  return Number.isNaN(Date.parse(raw)) ? undefined : raw;
}

/** `backend` is today's default (untouched API order): keep it out of the URL. */
function serializeSortKey(value: AnomalySortKey): string | null {
  return value === "backend" ? null : value;
}

export const anomalyUrlSchema: UrlStateSchema<AnomalyUrlState> = {
  meterId: {
    param: "meter_id",
    defaultValue: null,
    // Preserves the `?meter_id=M-109` link built by `MeterDetail`: any non-empty
    // id is accepted, because the filter itself is a plain string comparison.
    parse: (raw) => (raw.trim().length > 0 ? raw : undefined),
    serialize: serializeOptionalFilter,
  },
  type: {
    param: "type",
    defaultValue: null,
    parse: parseEnumValue(anomalyTypes),
    serialize: serializeOptionalFilter,
  },
  severity: {
    param: "severity",
    defaultValue: null,
    parse: parseEnumValue(anomalySeverities),
    serialize: serializeOptionalFilter,
  },
  status: {
    param: "status",
    defaultValue: null,
    parse: parseEnumValue(anomalyStatuses),
    serialize: serializeOptionalFilter,
  },
  detectedFrom: {
    param: "detected_from",
    defaultValue: null,
    parse: parseDateFilter,
    serialize: serializeOptionalFilter,
  },
  detectedTo: {
    param: "detected_to",
    defaultValue: null,
    parse: parseDateFilter,
    serialize: serializeOptionalFilter,
  },
  sort: {
    param: "sort",
    defaultValue: "backend",
    parse: parseEnumValue(anomalySortKeys),
    serialize: serializeSortKey,
  },
};

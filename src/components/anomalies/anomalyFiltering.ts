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
 * parameters**, so every filter and the header sort below run in the browser
 * over the already-fetched list. There is deliberately no attempt to proxy this
 * as server-side filtering: the page refetches nothing when the user changes a
 * control, and the default view keeps the API order untouched.
 */

export interface AnomalyFilterValues {
  /**
   * Free-text search. `null` (or a blank string) means "no search".
   *
   * The search also carries an explicit reset counter. That is the resolution of
   * a bug that survived six other designs: clearing the filters while a draft is
   * still inside the debounce window set `q` to `null` when it was ALREADY
   * `null`, so the reset produced no observable change in the value the box
   * receives. Nothing that infers the reset from `q` can see that event. Making
   * it an explicit counter in the state the box is given means two consecutive
   * clears are two distinct values, and the box always has something to react to.
   */
  search: { text: string; resetToken: number };
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
  search: { text: "", resetToken: 0 },
  meterId: null,
  type: null,
  severity: null,
  status: null,
  detectedFrom: null,
  detectedTo: null,
};

export function hasActiveFilters(filters: AnomalyFilterValues): boolean {
  // A whitespace-only term filters nothing, so it must not count as active.
  if (filters.search.text.trim().length > 0) {
    return true;
  }

  return (
    filters.meterId !== null ||
    filters.type !== null ||
    filters.severity !== null ||
    filters.status !== null ||
    filters.detectedFrom !== null ||
    filters.detectedTo !== null
  );
}

export type AnomalySortKey =
  | "backend"
  | "priority"
  | "severity"
  | "detected_at"
  | "confidence";

/** Every key that names a real ordering; `"backend"` means "do not sort". */
export type AnomalySortField = Exclude<AnomalySortKey, "backend">;

/** antd's sort direction vocabulary, narrowed to the two non-cancelled states. */
export type AnomalySortDirection = "ascend" | "descend";

/**
 * One ordering the UI can apply, in exactly one fixed direction.
 *
 * This is the **single** definition of each sort's meaning. It is read by
 * `applyAnomalySort` (which produces the array order the page renders) and by
 * the antd column `sorter`/`sortDirections`/`sortOrder` props in `AnomalyTable`
 * (which produce the header affordance). Because both consumers read the same
 * `compare` function, the header can never grow a comparison the page does not
 * use, and the page can never sort by something the header does not offer.
 *
 * The fixed direction is deliberate: these orderings are triage orderings
 * (most urgent / most severe / most recent / most confident first), not a
 * generic asc/desc toggle. The header therefore toggles one ordering on and
 * off, not through four direction combinations nobody asked for.
 */
export interface AnomalySortDefinition {
  key: AnomalySortField;
  /** The direction that visually matches this ordering's fixed direction. */
  direction: AnomalySortDirection;
  compare: (left: Anomaly, right: Anomaly) => number;
}

/**
 * Each `compare` is an **ascending** comparator (the convention antd expects):
 * the header supplies the direction and antd flips the sign for `descend`.
 * `applyAnomalySort` applies the exact same rule, so both paths produce the same
 * order and the tie behaviour stays stable (negating a `0` is still `0`).
 *
 * The directions reproduce the previous semantics exactly: `priority` ascending
 * with the backend's own tie-breakers, `severity` high-to-low, `detected_at`
 * newest-first, and `confidence` most-confident-first.
 */
export const anomalySortDefinitions: AnomalySortDefinition[] = [
  {
    key: "priority",
    direction: "ascend",
    compare: (left, right) =>
      left.priority - right.priority ||
      Date.parse(left.detected_at) - Date.parse(right.detected_at) ||
      left.meter_id.localeCompare(right.meter_id),
  },
  {
    key: "severity",
    direction: "descend",
    // Low-to-high here; `descend` turns it into high-to-low.
    compare: (left, right) =>
      severityRank[right.severity] - severityRank[left.severity],
  },
  {
    key: "detected_at",
    direction: "descend",
    // Oldest-to-newest here; `descend` turns it into newest-first.
    compare: (left, right) =>
      Date.parse(left.detected_at) - Date.parse(right.detected_at),
  },
  {
    key: "confidence",
    direction: "descend",
    // Least-to-most confident here; `descend` turns it into most-first.
    compare: (left, right) => left.confidence - right.confidence,
  },
];

/** Trims and case-folds a term so callers compare apples to apples. */
function normalizedTerm(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Fields the search looks at, and why only these:
 *
 * `id` and `meter_id` are the identifiers the table renders. `reason` and
 * `recommended_action` are the only other free-text human-readable DTO fields,
 * so a word like "spike" finds a row whose id says nothing useful.
 *
 * `type`, `severity` and `status` are excluded: they already have dedicated
 * exact-match controls, and a substring match would put two semantics on one
 * field. Nested `correlated_events[].description` and `data_quality.reason` are
 * excluded because the list does not render them, so a match would be invisible.
 */
function matchesSearch(anomaly: Anomaly, term: string): boolean {
  return [
    anomaly.id,
    anomaly.meter_id,
    anomaly.reason,
    anomaly.recommended_action,
  ].some((field) => field.toLowerCase().includes(term));
}

/** Returns a new array with only the anomalies matching every active filter. */
export function applyAnomalyFilters(
  anomalies: Anomaly[],
  filters: AnomalyFilterValues,
): Anomaly[] {
  const term = normalizedTerm(filters.search.text);

  return anomalies.filter((anomaly) => {
    if (term.length > 0 && !matchesSearch(anomaly, term)) {
      return false;
    }

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
 * ascending `priority` (the UI never recomputes it). Every other key looks up
 * its ordering in `anomalySortDefinitions` — the same registry the table header
 * reads — and applies it in the definition's own direction, mirroring the
 * `compare` + direction pairing antd uses.
 *
 * **This function and antd's own sorter are two passes over the same array, and
 * antd's is the one that decides what the user sees.** `AnomalyTable` hands
 * `dataSource` to antd with a controlled `sorter`, and antd re-sorts it in
 * `getSortData` (`antd/es/table/hooks/useSorter.js`), so the rendered row order
 * is antd's. That means a mistake in the direction applied here is **invisible
 * in the browser**: the table still looks right. The two agree today because
 * both negate the same ascending comparator for `descend` and both rely on a
 * stable sort, but the agreement is a property of that shared convention rather
 * than something the structure enforces, and no rendered assertion can catch a
 * divergence.
 *
 * That is why the ordering here is pinned by direct unit tests on this function
 * (see `anomalyFiltering.test.ts`) instead of only through the table: those are
 * the only guard on this path. The dashboard preview, which renders the table
 * without sort props, depends on this function alone.
 */
export function applyAnomalySort(
  anomalies: Anomaly[],
  sortKey: AnomalySortKey,
): Anomaly[] {
  if (sortKey === "backend") {
    return anomalies;
  }

  const definition = anomalySortDefinitions.find(
    (candidate) => candidate.key === sortKey,
  );
  if (!definition) {
    return anomalies;
  }

  const { compare, direction } = definition;
  // Negating the ascending comparator for `descend` mirrors antd exactly, and
  // because `0` negates to `0`, equal rows keep their incoming order.
  return [...anomalies].sort((left, right) =>
    direction === "ascend" ? compare(left, right) : -compare(left, right),
  );
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
 * Derived from `anomalySortDefinitions` rather than re-listed, so the header
 * that offers a sort and the parser that accepts a deep link can never
 * disagree: adding an ordering without teaching the URL about it would offer a
 * header click the link silently discards, and a stale key would let a link
 * select a column the table no longer has.
 */
export const anomalySortKeys: readonly AnomalySortKey[] = [
  "backend",
  ...anomalySortDefinitions.map((definition) => definition.key),
];

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
  search: {
    param: "q",
    defaultValue: { text: "", resetToken: 0 },
    // Only the text travels in the URL; the reset counter is local UI intent.
    parse: (raw) => {
      const trimmed = raw.trim();
      return { text: trimmed, resetToken: 0 };
    },
    serialize: (value) => {
      const trimmed = value.text.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
  },
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

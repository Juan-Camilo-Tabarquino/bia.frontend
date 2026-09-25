import type {
  AnomalySeverity,
  AnomalyStatus,
  AnomalyType,
} from "@/types/backend";

/**
 * Display metadata for the anomaly DTO enums.
 *
 * The backend emits `UPPER_SNAKE_CASE` type/severity values and lower-case
 * `status` values. The UI keeps the raw enum string visible (so a record always
 * matches the API payload) and adds a plain-language label next to it.
 */

/** `type` value that flags a measurement problem instead of a real anomaly. */
export const DATA_QUALITY_TYPE: AnomalyType = "DATA_QUALITY";

export const anomalyTypes: AnomalyType[] = [
  "REAL_ANOMALY",
  "EXPLAINABLE_ANOMALY",
  "FALSE_POSITIVE",
  "DATA_QUALITY",
];

export const anomalySeverities: AnomalySeverity[] = ["HIGH", "MEDIUM", "LOW"];

export const anomalyStatuses: AnomalyStatus[] = ["explained", "unexplained"];

export const anomalyTypeLabels: Record<AnomalyType, string> = {
  REAL_ANOMALY: "Real anomaly",
  EXPLAINABLE_ANOMALY: "Explainable anomaly",
  FALSE_POSITIVE: "False positive",
  DATA_QUALITY: "Data quality issue",
};

export const anomalyTypeColors: Record<AnomalyType, string> = {
  REAL_ANOMALY: "red",
  EXPLAINABLE_ANOMALY: "orange",
  FALSE_POSITIVE: "default",
  DATA_QUALITY: "purple",
};

export const severityColors: Record<AnomalySeverity, string> = {
  HIGH: "red",
  MEDIUM: "orange",
  LOW: "blue",
};

/** Lower rank means higher severity; used by the UI severity sort only. */
export const severityRank: Record<AnomalySeverity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export const anomalyStatusLabels: Record<AnomalyStatus, string> = {
  explained: "Explained",
  unexplained: "Unexplained",
};

/**
 * `DATA_QUALITY` records describe a measurement problem (bad or missing
 * readings), not a consumption anomaly, so they get a distinct treatment.
 */
export function isDataQuality(type: AnomalyType): boolean {
  return type === DATA_QUALITY_TYPE;
}

/** Renders the `0..1` confidence as a whole-number percentage. */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Renders a signed percentage with one decimal and a trailing `%`, so a
 * negative deviation keeps its minus sign and a positive one is marked with
 * `+`. The value is the API-provided number, never re-derived in the UI.
 */
export function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/** Renders a number with a fixed number of decimals for evidence display. */
export function formatMetric(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits);
}

import type {
  AnomalySeverity,
  AnomalyStatus,
  AnomalyType,
} from "@/types/backend";

/**
 * Display metadata for the anomaly DTO enums.
 *
 * The backend emits `UPPER_SNAKE_CASE` type/severity values and lower-case
 * `status` values. These maps add a plain-language Spanish label; they never
 * rewrite the wire value, which stays in the DTO and in every comparator.
 *
 * Where each half actually lands, measured in a real browser (`/anomalies` and
 * `/anomalies/[id]`), because "the raw value stays visible" is a claim about
 * RENDER SITES and not about this file:
 *
 * - `type` — raw value **and** label, in `AnomalyTypeTag` (table and detail).
 * - `severity` — raw value **and** label, in the table's Severidad column.
 * - `status` — label **alone** in the table's Estado column;
 *   `Sin explicación (unexplained)` on the detail page.
 *
 * The `status` column is the one asymmetry: a reader cross-referencing the API
 * payload cannot see `explained`/`unexplained` in the list. That is pre-existing
 * behaviour this phase did not introduce, and it is recorded as an open advisory
 * in `odd/tasks/refactor-improve-ui-phase-6.md` rather than changed here.
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
  REAL_ANOMALY: "Anomalía real",
  EXPLAINABLE_ANOMALY: "Anomalía explicable",
  FALSE_POSITIVE: "Falso positivo",
  DATA_QUALITY: "Problema de calidad de datos",
};

export const anomalyTypeColors: Record<AnomalyType, string> = {
  REAL_ANOMALY: "red",
  EXPLAINABLE_ANOMALY: "orange",
  FALSE_POSITIVE: "default",
  DATA_QUALITY: "purple",
};

/**
 * Plain-language labels for the `severity` enum. The raw `HIGH`/`MEDIUM`/`LOW`
 * value stays on screen next to this label wherever a record is shown, because
 * those are the exact strings the API payload carries.
 */
export const anomalySeverityLabels: Record<AnomalySeverity, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
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
  explained: "Explicada",
  unexplained: "Sin explicación",
};

/**
 * `DATA_QUALITY` records describe a measurement problem (bad or missing
 * readings), not a consumption anomaly, so they get a distinct treatment.
 */
export function isDataQuality(type: AnomalyType): boolean {
  return type === DATA_QUALITY_TYPE;
}


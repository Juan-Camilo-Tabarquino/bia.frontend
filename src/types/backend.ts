// Backend DTOs.
//
// Authoritative source: `docs/endpoints.md` plus the backend router/handlers.
// Every field below is the exact wire name the backend emits, so there is no
// client-side rename or transform layer anywhere in `src`.
//
// Naming note: the readings payload is serialized from exported Go struct
// fields (`MeterID`, `Consumption`, ...), while every other resource uses the
// backend's `snake_case` JSON tags. Both shapes are reproduced verbatim.

/** Meter identifier as returned by `GET /api/meters` (e.g. `"M-101"`). */
export type MeterId = string;

/**
 * Single reading returned by `GET /api/meters/{meterId}/readings`.
 *
 * `Consumption` is kWh, `Voltage` is volts, `Current` is amperes and
 * `PowerFactor` is the dimensionless power factor. Only `status` is optional:
 * it is the single field the backend re-tags with a lowercase JSON name, while
 * the other six keep their exported Go names.
 */
export interface Reading {
  MeterID: MeterId;
  /** RFC3339 timestamp with an explicit zone. */
  Timestamp: string;
  Consumption: number;
  Voltage: number;
  Current: number;
  PowerFactor: number;
  status?: string;
}

/** Deterministic anomaly classification. */
export type AnomalyType =
  | "REAL_ANOMALY"
  | "EXPLAINABLE_ANOMALY"
  | "FALSE_POSITIVE"
  | "DATA_QUALITY";

/** Deterministic severity. */
export type AnomalySeverity = "HIGH" | "MEDIUM" | "LOW";

/** Whether the anomaly has a correlated explanation. */
export type AnomalyStatus = "explained" | "unexplained";

/**
 * Statistical baseline the deterministic scorer compared the anomalous window
 * against. Every field is a plain number; no derived value is computed by the
 * frontend.
 */
export interface Baseline {
  /** Mean consumption (kWh) over the baseline window. */
  mean: number;
  /** Standard deviation of consumption over the baseline window. */
  stddev: number;
  /** Number of readings in the baseline window. */
  count: number;
  voltage_mean: number;
  current_mean: number;
  power_factor_mean: number;
}

/**
 * Event the pipeline correlated with the deviation. Only events that actually
 * explain the deviation are listed, so the array is frequently empty.
 */
export interface CorrelatedEvent {
  id: string;
  type: string;
  /** RFC3339 timestamp. */
  start: string;
  /** RFC3339 timestamp. */
  end: string;
  description: string;
}

/** Data-quality verdict attached to the anomaly by the pipeline. */
export interface DataQuality {
  /** `true` only when the readings themselves look unreliable. */
  flagged: boolean;
  /** Empty string when `flagged` is `false`. */
  reason: string;
}

/**
 * Full anomaly object returned by `GET /api/anomalies` and
 * `GET /api/anomalies/{id}`.
 *
 * `GET /api/anomalies` is sorted by the backend in ascending `priority` (then
 * `detected_at`, then `meter_id`), so the response order already answers "what
 * should be investigated first". The UI never re-derives `priority`: it shows
 * the API value and, at most, re-sorts the fetched array on the user's request.
 */
export interface Anomaly {
  id: string;
  meter_id: MeterId;
  /** RFC3339 timestamp. */
  detected_at: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  /** Real number in `[0, 1]`, produced by the deterministic scorer. */
  confidence: number;
  reason: string;
  recommended_action: string;
  status: AnomalyStatus;
  /** Investigation order assigned by the backend; `1` is the most urgent. */
  priority: number;
  /** Baseline statistics for the anomalous window. */
  baseline: Baseline;
  /** Signed percentage change in consumption, relative to `baseline.mean`. */
  consumption_change_pct: number;
  /** Signed percentage change in voltage. */
  voltage_change_pct: number;
  /** Signed percentage change in current. */
  current_change_pct: number;
  /** Signed percentage change in power factor. */
  power_factor_change_pct: number;
  /** Always present; `[]` when no event explains the deviation. */
  correlated_events: CorrelatedEvent[];
  /** Data-quality verdict; `flagged` is `true` only for measurement problems. */
  data_quality: DataQuality;
  /** Narrated explanation; absent when the LLM narrator is disabled. */
  llm_analysis?: string;
}

/** Meter metadata returned by `GET /api/meters/{meterId}`. */
export interface MeterDetail {
  id: string;
  meter_id: MeterId;
  /** Always `""` in the current backend response. */
  name: string;
  /** Always `""` in the current backend response. */
  location: string;
  status: "OK" | "DEGRADED";
  /** RFC3339 timestamp. */
  created_at: string;
  readings_count: number;
  /** RFC3339 timestamp of the newest reading. */
  last_reading_at: string;
}

/** `GET /api/dashboard/summary` */
export interface DashboardSummary {
  health: string;
  meters: number;
  anomalies: number;
  /** Observed literal `"latest"`. */
  lastRun: string;
}

/** `GET /api/health` */
export interface HealthResponse {
  status: string;
}

/**
 * Pipeline stage reported by `GET /api/ai/analysis/{id}`.
 *
 * The seven real stages (`ANALYSIS_STAGES` order) plus the three lifecycle-only
 * values: `"queued"` before the pipeline starts, and `"completed"` / `"failed"`
 * once it ends.
 */
export type AnalysisStage =
  | "queued"
  | "lecturas"
  | "baseline"
  | "deteccion"
  | "correlacion"
  | "eventos"
  | "explicacion"
  | "recomendacion"
  | "completed"
  | "failed";

/** Stage counter returned next to `AnalysisStage` while a run is in flight. */
export interface AnalysisProgress {
  done: number;
  total: number;
}

/**
 * Platform-wide closing counters returned on completion: how many anomalies the
 * run detected and how many of them require priority attention.
 */
export interface AnalysisPlatformSummary {
  total_anomalies: number;
  high_priority: number;
}

/** `POST /api/ai/analyze` */
export interface AnalyzeResponse {
  analysisId: string;
  /** Meter the accepted run belongs to. */
  meter_id: MeterId;
  /** Always `"queued"` on the accepted (`202`) response. */
  status: string;
}

/** `GET /api/ai/analysis/{id}` */
export interface AnalysisResult {
  analysisId: string;
  /** Meter the run belongs to. */
  meter_id: MeterId;
  /**
   * Observed values: `"queued"`, `"completed"`.
   * Extended lifecycle from the per-meter contract: `"running"`, `"failed"`.
   */
  status: string;
  /** Current pipeline stage for the run; see `AnalysisStage`. */
  stage: AnalysisStage;
  /** Completed / total stage counter for the run. */
  progress: AnalysisProgress;
  /** RFC3339 timestamp of when the run started. */
  started_at: string;
  /** RFC3339 timestamp of when the run ended, or `null` while it is running. */
  finished_at: string | null;
  anomalies: Anomaly[];
  /**
   * Platform-wide closing counters. The backend marks this field `omitempty`, so
   * it is ABSENT (not null) until the run completes — read it only when
   * `status === "completed"`, or guard for `undefined`.
   */
  platform?: AnalysisPlatformSummary;
  /** Failure reason reported by the backend when `status` is `"failed"`. */
  error?: string | null;
}

// Backend DTO TypeScript interfaces

/**
 * Basic meter information returned by `/meters`.
 */
export interface Meter {
  /** Unique identifier */
  id: string;
  /** Optional human‑readable name */
  name?: string;
}

/**
 * Detailed meter information returned by `/meter/{id}/detail`.
 * The shape is not fixed; we keep it as a generic record.
 */
export type MeterDetail = Record<string, unknown>;

/**
 * Single reading measurement.
 */
export interface Reading {
  /** ISO timestamp */
  timestamp: string;
  /** Measured value */
  value: number;
}

/**
 * Anomaly information for a meter.
 */
export interface Anomaly {
  meterId: string;
  severity: string;
}

/**
 * Full analysis result used on the dashboard.
 */
export interface Analysis {
  /** Chart data series */
  chartData: Reading[];
  /** Summary text */
  summary: string;
  /** Detected anomalies */
  anomalies: Anomaly[];
  /** Raw tool output – kept as unknown */
  toolOutput?: unknown;
}

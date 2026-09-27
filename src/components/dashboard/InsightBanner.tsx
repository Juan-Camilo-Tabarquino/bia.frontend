"use client";

import styles from "./InsightBanner.module.scss";

interface InsightBannerProps {
  /**
   * Total anomalies as reported by `GET /api/dashboard/summary` (`anomalies`).
   * Taken verbatim from the DTO: the summary is the authoritative total and is
   * never re-derived here.
   */
  total?: number | null;
  /**
   * Plain count of the already-fetched anomaly rows whose `severity` is
   * `HIGH`. The summary DTO carries no severity breakdown, so — exactly like
   * the per-severity tags elsewhere on this page — the count is derived in the
   * browser from the fetched array, not invented.
   */
  highSeverity?: number | null;
}

/** A count is usable only when it is a finite, non-negative number. */
function safeCount(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

/**
 * One full-width line of context for the KPI area, with the number that
 * matters highlighted in teal.
 *
 * Only two DTO-backed facts feed it: the summary's total anomaly count and the
 * browser-derived count of `HIGH` severity rows. It deliberately never mentions
 * a previous period — `DashboardSummary.lastRun` is the literal `"latest"`, not
 * a date, and the API exposes no earlier run to compare against — and it never
 * prints a metric the DTO does not carry.
 */
export function InsightBanner({ total, highSeverity }: InsightBannerProps) {
  const safeTotal = safeCount(total);
  const safeHighSeverity = safeCount(highSeverity);

  if (safeTotal === null) {
    return (
      <p className={styles.banner}>
        Todavía no hay datos de anomalías para resumir.
      </p>
    );
  }

  if (safeTotal === 0) {
    return (
      <p className={styles.banner}>
        No se detectaron anomalías en la última ejecución.
      </p>
    );
  }

  return (
    <p className={styles.banner}>
      Hay {safeTotal} anomalías en la última ejecución
      {safeHighSeverity !== null && (
        <>
          , <span className={styles.number}>{safeHighSeverity}</span> de
          severidad alta
        </>
      )}
      .
    </p>
  );
}

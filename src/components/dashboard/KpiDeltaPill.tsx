"use client";

import { formatSignedPercent } from "@/components/formatters";
import styles from "./KpiDeltaPill.module.scss";

/**
 * Direction of a signed change. `flat` is a real state, not a fallback: the
 * DTO can legitimately carry exactly `0`, and neither inventing a direction for
 * it nor hiding it would be truthful.
 */
type DeltaDirection = "up" | "down" | "flat";

interface KpiDeltaPillProps {
  /**
   * Signed percentage already carried by the DTO, for example
   * `Anomaly.consumption_change_pct`.
   *
   * This is the change against the anomaly's own `baseline.mean`, exactly as
   * the backend defines the field. It is NOT a period-over-period delta: the
   * API exposes no previous run, so no such comparison is possible here.
   */
  changePct?: number | null;
}

/** Arrow glyph per direction; `flat` deliberately has none. */
const directionArrows: Record<DeltaDirection, string> = {
  up: "↑",
  down: "↓",
  flat: "",
};

/**
 * Screen-reader wording per direction. Colour and a glyph convey direction to a
 * sighted user only, so the same fact is stated in text for assistive tech.
 */
const directionLabels: Record<DeltaDirection, string> = {
  up: "aumento",
  down: "descenso",
  flat: "sin cambios",
};

function resolveDirection(changePct: number): DeltaDirection {
  if (changePct > 0) return "up";
  if (changePct < 0) return "down";
  return "flat";
}

/**
 * Delta pill for one DTO-backed percentage change.
 *
 * Green down / red up is Bia's visual signature: an increase takes the error
 * colour and a decrease the success colour. Both colours come from antd's CSS
 * variables (`--bia-color-*`), never a literal, so the light/dark toggle keeps
 * working; a hardcoded colour would break one of the two modes. The value is
 * rendered through the shared `formatSignedPercent`, so a negative DTO value
 * keeps its minus sign and a positive one keeps its plus.
 *
 * A missing or non-finite value renders nothing at all rather than a pill with
 * `NaN` or a stray `undefined`: a KPI whose delta is not honest simply shows no
 * delta.
 */
export function KpiDeltaPill({ changePct }: KpiDeltaPillProps) {
  if (typeof changePct !== "number" || !Number.isFinite(changePct)) {
    return null;
  }

  const direction = resolveDirection(changePct);
  const arrow = directionArrows[direction];

  return (
    <span
      className={`${styles.pill} ${styles[direction]}`}
      data-direction={direction}
    >
      {arrow !== "" && <span aria-hidden="true">{arrow}</span>}
      <span className={styles.value}>{formatSignedPercent(changePct)}</span>
      <span className="sr-only">{directionLabels[direction]}</span>
    </span>
  );
}

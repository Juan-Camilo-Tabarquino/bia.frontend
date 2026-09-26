"use client";

import { useContext, useId, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Empty, Spin } from "antd";
import type { Reading } from "@/types/backend";
import { chartColors } from "@/theme/tokens";
import { ThemeModeContext } from "@/theme/theme-provider";
import styles from "./ReadingsChart.module.scss";

/**
 * An anomaly marker already scoped to the plotted meter.
 *
 * The page derives this list in the browser from `GET /api/anomalies` filtered
 * by `meter_id`: the API exposes no per-meter subset, no baseline and no delta.
 */
export interface ReadingAnomalyMarker {
  id: string;
  /** RFC3339 timestamp of the detection. */
  detectedAt: string;
  /** Human-readable label, e.g. `HIGH · Real anomaly`. */
  label: string;
}

interface ReadingsChartProps {
  data: Reading[];
  /** Markers for this meter; empty when no anomaly reaches it. */
  anomalyMarkers?: ReadingAnomalyMarker[];
  loading?: boolean;
}

type SignalKey = "Consumption" | "Voltage" | "Current" | "PowerFactor";

interface SignalConfig {
  key: SignalKey;
  label: string;
  unit: string;
}

/**
 * Presentation choice: one chart with a signal selector.
 *
 * The four reading signals carry different units and magnitudes (kWh, V, A and
 * a dimensionless 0-1 power factor), so a shared Y axis would either flatten
 * the small series or silently imply that 230 V and 5 A are comparable. Four
 * separate charts would fix the units but duplicate the same time axis and hand
 * assistive tech four images for one question, so this keeps a single labelled
 * figure whose axis always belongs to one unit at a time.
 */
const signals: SignalConfig[] = [
  { key: "Consumption", label: "Consumption", unit: "kWh" },
  { key: "Voltage", label: "Voltage", unit: "V" },
  { key: "Current", label: "Current", unit: "A" },
  { key: "PowerFactor", label: "Power factor", unit: "dimensionless 0-1" },
];

/**
 * Derived chart key for the anomaly marker series. It is not a backend field:
 * the series holds the selected signal value only on the marked readings and
 * `null` everywhere else, so the dots exist solely where an anomaly was
 * detected.
 */
const ANOMALY_DATA_KEY = "anomalyValue";

/**
 * Snaps a detection to the closest plotted reading, or returns `null` when it
 * cannot be drawn honestly.
 *
 * The timeline is a category axis built from `Timestamp`, so a marker can only
 * sit on an existing reading: the detection is snapped to the nearest one. A
 * detection outside the plotted window (before the first or after the last
 * reading, or with no readings at all) is never pinned to an edge, because that
 * would claim a reading time the detection never had.
 */
function snapToNearestTimestamp(
  detectedAt: string,
  timestamps: string[],
): string | null {
  const target = Date.parse(detectedAt);
  if (Number.isNaN(target)) {
    return null;
  }

  let nearest: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let earliest = Number.POSITIVE_INFINITY;
  let latest = Number.NEGATIVE_INFINITY;

  timestamps.forEach((timestamp) => {
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) {
      return;
    }
    earliest = Math.min(earliest, parsed);
    latest = Math.max(latest, parsed);
    const distance = Math.abs(parsed - target);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = timestamp;
    }
  });

  if (nearest === null || target < earliest || target > latest) {
    return null;
  }

  return nearest;
}

/**
 * Four-signal readings timeline.
 *
 * Renders every `Reading` untouched: the raw `Timestamp`, `Consumption`,
 * `Voltage`, `Current` and `PowerFactor` values are read straight from the DTO,
 * and only the selected signal is plotted against its own unit axis.
 */
export default function ReadingsChart({
  data,
  anomalyMarkers = [],
  loading,
}: ReadingsChartProps) {
  const selectorId = useId();
  const descriptionId = useId();
  const markerHeadingId = useId();
  const [signalKey, setSignalKey] = useState<SignalKey>("Consumption");

  // Recharts writes its colours as SVG presentation attributes, where `var()` is
  // not guaranteed to resolve (SVG2 still parses them as attribute grammar, not
  // CSS declarations), so the chart takes real values for the current mode. It
  // also renders outside the app shell in isolation, hence the non-throwing read.
  const mode = useContext(ThemeModeContext)?.mode ?? "dark";
  const colors = chartColors[mode];

  const selected = signals.find((signal) => signal.key === signalKey) ?? signals[0];

  if (loading) {
    // antd 6 deprecated `Spin`'s `tip` in favour of `description`; the
    // description renders without children, so the loading state stays
    // perceivable instead of being an unlabelled spinner.
    return <Spin description="Cargando gráfico…" />;
  }

  const timestamps = data.map((reading) => reading.Timestamp);

  // Client-derived markers: each detection is resolved once to the reading it
  // can be drawn on, or to `null` when it falls outside the plotted window.
  const markerRows = anomalyMarkers.map((marker) => ({
    ...marker,
    plottedAt: snapToNearestTimestamp(marker.detectedAt, timestamps),
  }));

  const markedTimestamps = new Set(
    markerRows
      .map((marker) => marker.plottedAt)
      .filter((timestamp): timestamp is string => timestamp !== null),
  );

  const points = data.map((reading) => {
    const value = reading[selected.key];
    return {
      Timestamp: reading.Timestamp,
      value,
      [ANOMALY_DATA_KEY]: markedTimestamps.has(reading.Timestamp) ? value : null,
    };
  });

  const markerSummary =
    anomalyMarkers.length === 0
      ? "No anomaly markers are recorded for this meter in the loaded window."
      : `Anomaly markers for this meter (${anomalyMarkers.length}): ${anomalyMarkers
          .map((marker) => `${marker.detectedAt} ${marker.label}`)
          .join("; ")}. Markers outside the plotted window are listed but not drawn.`;

  return (
    <figure className={styles.figure}>
      <fieldset className={styles.selector}>
        <legend className={styles.legend}>Signal</legend>
        <div className={styles.options}>
          {signals.map((signal) => (
            <label key={signal.key} className={styles.option}>
              <input
                type="radio"
                name={`readings-signal-${selectorId}`}
                value={signal.key}
                checked={signal.key === selected.key}
                onChange={() => setSignalKey(signal.key)}
              />
              <span>{`${signal.label} (${signal.unit})`}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {data.length === 0 ? (
        // The chart's region is blank when the backend answers `200 null` for
        // an unknown meter or an empty window, so it says so instead of
        // drawing an empty 300px plot.
        <Empty
          className={styles.empty}
          description="No hay lecturas en el rango seleccionado."
        />
      ) : (
        <ResponsiveContainer
          width="100%"
          height={300}
          aria-label={`Readings chart: ${selected.label} (${selected.unit}) over time`}
          aria-describedby={descriptionId}
          role="img"
        >
          <LineChart data={points}>
            <XAxis dataKey="Timestamp" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              name={`${selected.label} (${selected.unit})`}
              stroke={colors.series}
              dot={false}
              activeDot={{ r: 4 }}
            />
            {/* Anomaly markers: a distinct ring plus text elsewhere, never colour alone. */}
            <Line
              type="monotone"
              dataKey={ANOMALY_DATA_KEY}
              name="Anomaly marker"
              stroke="transparent"
              connectNulls={false}
              isAnimationActive={false}
              dot={{
                r: 5,
                stroke: colors.marker,
                strokeWidth: 2,
                fill: colors.markerSurface,
              }}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
      <figcaption id={descriptionId} className="sr-only">
        {`Line chart of ${selected.label} in ${selected.unit} over time, ${data.length} readings. ${markerSummary}`}
      </figcaption>
      <section className={styles.markerList} aria-labelledby={markerHeadingId}>
        <h2 id={markerHeadingId} className={styles.markerHeading}>
          Anomaly markers
        </h2>
        <p className={styles.note}>
          Markers are derived in the browser from the anomaly list filtered by
          this meter id. The backend exposes no baseline yet, so no baseline
          band or delta line is drawn.
        </p>
        {anomalyMarkers.length === 0 ? (
          <p className={styles.note}>No anomalies recorded for this meter.</p>
        ) : (
          <ul className={styles.markerItems}>
            {markerRows.map((marker) => (
              <li key={marker.id}>
                <span className={styles.markerTime}>{marker.detectedAt}</span>
                <span className={styles.markerLabel}>{` ${marker.label}`}</span>
                <span className="sr-only">
                  {marker.plottedAt
                    ? ` plotted at the closest reading, ${marker.plottedAt}.`
                    : " outside the plotted window, so it is not drawn on the timeline."}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </figure>
  );
}

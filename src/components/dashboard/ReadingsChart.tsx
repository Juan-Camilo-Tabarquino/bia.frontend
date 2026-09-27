"use client";

import { useContext, useId, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Empty, Spin } from "antd";
import type { Reading } from "@/types/backend";
import { chartColors, sharedTokens } from "@/theme/tokens";
import { ThemeModeContext } from "@/theme/theme-provider";
import { formatDateTime } from "../formatters";
import styles from "./ReadingsChart.module.scss";

/**
 * An anomaly marker already scoped to the plotted meter.
 *
 * The page derives this list in the browser from `GET /api/anomalies` filtered
 * by `meter_id`: the API exposes no per-meter subset and no delta, but it does
 * carry the statistical `baseline` for every record. `baseline.mean` is the
 * mean CONSUMPTION in kWh, so it is forwarded here to feed the consumption
 * reference line instead of being discarded.
 */
export interface ReadingAnomalyMarker {
  id: string;
  /** RFC3339 timestamp of the detection. */
  detectedAt: string;
  /** Human-readable label, e.g. `HIGH · Real anomaly`. */
  label: string;
  /**
   * Mean consumption (kWh) of the baseline window this detection was compared
   * against, straight from `Anomaly.baseline.mean`. Optional so a caller with
   * no baseline data still renders the markers.
   */
  baselineMean?: number;
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
  /**
   * Unit printed on the Y axis. Empty for a dimensionless signal, because an
   * axis labelled `dimensionless 0-1` would clutter the ticks with a value the
   * power factor does not carry.
   */
  axisUnit: string;
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
  { key: "Consumption", label: "Consumption", unit: "kWh", axisUnit: "kWh" },
  { key: "Voltage", label: "Voltage", unit: "V", axisUnit: "V" },
  { key: "Current", label: "Current", unit: "A", axisUnit: "A" },
  {
    key: "PowerFactor",
    label: "Power factor",
    unit: "dimensionless 0-1",
    axisUnit: "",
  },
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
 * Distinct baseline means to draw as reference lines.
 *
 * Several anomalies can reach one meter, and each detects its own baseline
 * window, so their means are separate DTO values rather than one figure.
 * Averaging them would invent a number that is in no payload, and picking only
 * the leading detection would hide the baselines of the others, so every
 * distinct value keeps its own line. Identical means collapse because drawing
 * the same line twice is still one line.
 */
function distinctBaselineMeans(markers: ReadingAnomalyMarker[]): number[] {
  const means = new Set<number>();
  markers.forEach((marker) => {
    const mean = marker.baselineMean;
    if (typeof mean === "number" && Number.isFinite(mean)) {
      means.add(mean);
    }
  });
  return Array.from(means).sort((a, b) => a - b);
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

  // `baseline.mean` is the mean CONSUMPTION, so the reference line is only
  // meaningful on the Consumption axis. On another signal the line is withheld
  // (and the note below says which signal owns it) rather than plotting a
  // consumption value on the voltage axis, which would be a wrong chart.
  const consumptionSelected = selected.key === "Consumption";
  const baselineMeans = distinctBaselineMeans(anomalyMarkers);
  const visibleBaselineMeans = consumptionSelected ? baselineMeans : [];

  const markerSummary =
    anomalyMarkers.length === 0
      ? "No anomaly markers are recorded for this meter in the loaded window."
      : `Anomaly markers for this meter (${anomalyMarkers.length}): ${anomalyMarkers
          .map(
            (marker) =>
              `${formatDateTime(marker.detectedAt)} ${marker.label}`,
          )
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
        <>
          <ResponsiveContainer
            width="100%"
            height={300}
            aria-label={`Readings chart: ${selected.label} (${selected.unit}) over time`}
            aria-describedby={descriptionId}
            role="img"
          >
            <LineChart data={points}>
              {/* Soft grid: a faint dashed rule so the grid orients the eye
                  without competing with the series. Colours come from the
                  token map, not CSS variables (see `chartColors`). */}
              <CartesianGrid
                stroke={colors.grid}
                strokeDasharray="3 3"
                vertical={false}
              />
              {/* The axis category key stays the raw `Timestamp`: the marker
                  snapping above and the point rows below both depend on it. Only
                  the rendered tick label is formatted. */}
              <XAxis
                dataKey="Timestamp"
                tick={{ fontSize: 12, fill: colors.axis }}
                tickFormatter={(value) => formatDateTime(String(value))}
              />
              {/* The unit is part of the axis, not just the accessible name: the
                  power factor carries none, so its axis prints no unit. */}
              <YAxis
                tick={{ fontSize: 12, fill: colors.axis }}
                unit={selected.axisUnit === "" ? undefined : selected.axisUnit}
              />
              {/* The default tooltip would print the raw category label and use
                  a light-only surface; the formatter and the token styles keep
                  it readable in both modes and never change the data. */}
              <Tooltip
                labelFormatter={(label) => formatDateTime(String(label))}
                contentStyle={{
                  backgroundColor: colors.tooltipBackground,
                  border: `1px solid ${colors.tooltipBorder}`,
                  borderRadius: sharedTokens.borderRadius,
                  color: colors.tooltipText,
                  fontSize: 12,
                }}
                labelStyle={{ color: colors.tooltipText }}
                itemStyle={{ color: colors.tooltipText }}
                cursor={{ stroke: colors.axis, strokeDasharray: "3 3" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={`${selected.label} (${selected.unit})`}
                stroke={colors.series}
                dot={false}
                activeDot={{ r: 4 }}
              />
              {/* One dashed line per distinct `baseline.mean` (see
                  `distinctBaselineMeans`). `extendDomain` keeps a baseline that
                  sits outside the plotted readings visible instead of silently
                  discarding it. */}
              {visibleBaselineMeans.map((mean) => (
                <ReferenceLine
                  key={mean}
                  y={mean}
                  stroke={colors.reference}
                  strokeDasharray="6 4"
                  ifOverflow="extendDomain"
                  label={{
                    value: `Media ${mean}`,
                    position: "insideTopRight",
                    fill: colors.reference,
                    fontSize: 12,
                  }}
                />
              ))}
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
          {/* Qualifies the hidden reference line: `baseline.mean` is kWh
              consumption, so on any other signal it is not drawn. */}
          {!consumptionSelected && baselineMeans.length > 0 && (
            <p className={styles.note} role="note">
              {`La línea de referencia es la media de consumo (kWh) del baseline: se dibuja solo con la señal Consumo, no sobre ${selected.label}.`}
            </p>
          )}
          {/* Legend with swatches, antd-free: recharts' own legend cannot tell
              the reference line apart from the series, so this is explicit. */}
          <ul className={styles.chartLegend} aria-label="Leyenda del gráfico">
            <li className={styles.legendItem}>
              <span
                className={styles.legendLine}
                style={{ backgroundColor: colors.series }}
                aria-hidden="true"
              />
              <span>{`${selected.label} (${selected.unit})`}</span>
            </li>
            {anomalyMarkers.length > 0 && (
              <li className={styles.legendItem}>
                <span
                  className={styles.legendMarker}
                  style={{
                    borderColor: colors.marker,
                    backgroundColor: colors.markerSurface,
                  }}
                  aria-hidden="true"
                />
                <span>Marcador de anomalía</span>
              </li>
            )}
            {visibleBaselineMeans.map((mean) => (
              <li key={mean} className={styles.legendItem}>
                <span
                  className={styles.legendReference}
                  style={{ borderColor: colors.reference }}
                  aria-hidden="true"
                />
                <span>{`Media de referencia: ${mean} kWh`}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <figcaption id={descriptionId} className="sr-only">
        {`Line chart of ${selected.label} in ${selected.unit} over time, ${data.length} readings. ${markerSummary}`}
      </figcaption>
      <section className={styles.markerList} aria-labelledby={markerHeadingId}>
        <h2 id={markerHeadingId} className={styles.markerHeading}>
          Anomaly markers
        </h2>
        <p className={styles.note}>
          Los marcadores se derivan en el navegador de la lista de anomalías
          filtrada por el id de este medidor. La media del baseline
          (`baseline.mean`, en kWh) sí viaja en el DTO y se dibuja como línea de
          referencia solo sobre la señal Consumo.
        </p>
        {anomalyMarkers.length === 0 ? (
          <p className={styles.note}>No anomalies recorded for this meter.</p>
        ) : (
          <ul className={styles.markerItems}>
            {markerRows.map((marker) => (
              <li key={marker.id}>
                <span className={styles.markerTime}>
                  {formatDateTime(marker.detectedAt)}
                </span>
                <span className={styles.markerLabel}>{` ${marker.label}`}</span>
                <span className="sr-only">
                  {marker.plottedAt
                    ? ` plotted at the closest reading, ${formatDateTime(marker.plottedAt)}.`
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

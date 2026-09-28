"use client";

import Link from "next/link";

import { Card, Tag, Typography } from "antd";

import type { Anomaly, MeterSummary } from "../types/backend";

import {
  anomalySeverityLabels,
  anomalyTypeLabels,
  severityColors,
} from "./anomalies/anomalyLabels";
import {
  formatDateTime,
  formatMetric,
  formatSignedPercent,
  meterStatusLabel,
} from "./formatters";
import styles from "./MeterCard.module.scss";

const { Text } = Typography;

interface MeterCardProps {
  /** The `GET /api/meters` row this card renders. */
  meter: MeterSummary;
  /**
   * The meter's most urgent anomaly: **the first row in the API-ordered
   * `GET /api/anomalies` array whose `meter_id` is this meter**. `null` (or
   * absent) means the browser join found no anomaly for it, which is what the
   * card reports as "Sin anomalías".
   */
  anomaly?: Anomaly | null;
}

/**
 * One meter rendered as a clickable card.
 *
 * The whole card is the hit area through the stretched-link pattern: the card
 * root is the positioned container (`antd` already gives `.ant-card`
 * `position: relative`, and `MeterCard.module.scss` pins it explicitly) and the
 * anchor's `::after` overlay covers it. The anchor keeps the id as its only
 * text, so its accessible name stays exactly the meter id — wrapping the whole
 * card in an anchor instead would fold the status and the last reading into the
 * name, and an `aria-label` on such an anchor would break label-in-name.
 *
 * The card owns **no request**. Everything it shows is handed to it: the
 * `GET /api/meters` row (id, `status`, `consumption`, `last_reading_at`) and the
 * anomaly the list already joined from `GET /api/anomalies`. That is the whole
 * point of the two-list shape — before the `/meters` change this card issued one
 * `GET /meters/{id}` per rendered card, the recorded N+1 advisory, because the
 * list endpoint only returned ids and carried neither a status nor a timestamp.
 * A missing anomaly is not an error: it is the normal case for a healthy meter.
 *
 * `consumption_change_pct` is read verbatim from the anomaly DTO (it is a signed
 * percentage relative to that anomaly's own `baseline`); the UI never re-derives
 * it and never compares against a previous period, which the API does not expose.
 */
export function MeterCard({ meter, anomaly = null }: MeterCardProps) {
  const severity = anomaly?.severity;

  return (
    <Card hoverable className={styles.card}>
      {/* The href is encoded the same way the rest of the app navigates to a
          detail route (`MeterDetail`, `AnomalyDetail`, `AnomalyTable`). */}
      <Link
        className={styles.link}
        href={`/meter/${encodeURIComponent(meter.id)}`}
      >
        {meter.id}
      </Link>

      <div className={styles.badge}>
        {severity && anomaly ? (
          <>
            <Tag color={severityColors[severity]}>
              {severity} · {anomalySeverityLabels[severity]}
            </Tag>
            <Text type="secondary">{anomalyTypeLabels[anomaly.type]}</Text>
          </>
        ) : (
          <Tag>Sin anomalías</Tag>
        )}
      </div>

      <div className={styles.details}>
        <div className={styles.row}>
          <Text type="secondary">Estado</Text>
          <Text>{meterStatusLabel(meter.status)}</Text>
        </div>
        <div className={styles.row}>
          <Text type="secondary">Consumo</Text>
          <Text>{formatMetric(meter.consumption, 1)} kWh</Text>
        </div>
        <div className={styles.row}>
          <Text type="secondary">Variación</Text>
          {/* No anomaly means no change to show. A dash is honest here; a `0%`
              would invent a measurement the API never reported. */}
          <Text>
            {anomaly
              ? formatSignedPercent(anomaly.consumption_change_pct)
              : "—"}
          </Text>
        </div>
        <div className={styles.row}>
          <Text type="secondary">Última lectura</Text>
          <Text>{formatDateTime(meter.last_reading_at)}</Text>
        </div>
      </div>
    </Card>
  );
}

export default MeterCard;

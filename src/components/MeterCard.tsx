"use client";

import Link from "next/link";

import { Card, Skeleton, Typography } from "antd";

import { useGetMeterDetailQuery } from "../features/api/apiSlice";

import { formatDateTime, meterStatusLabel } from "./formatters";
import styles from "./MeterCard.module.scss";

const { Text } = Typography;

interface MeterCardProps {
  /** Meter id from `GET /api/meters`; also the card's only navigation target. */
  meterId: string;
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
 * `GET /api/meters` returns bare ids with no status or timestamp, so this card
 * owns its own `useGetMeterDetailQuery`. One request per *rendered* card is the
 * accepted N+1: a failure here degrades this card alone and never the list.
 */
export function MeterCard({ meterId }: MeterCardProps) {
  const { data, error, isLoading } = useGetMeterDetailQuery(meterId);

  return (
    <Card hoverable className={styles.card}>
      {/* The href is encoded the same way the rest of the app navigates to a
          detail route (`MeterDetail`, `AnomalyDetail`, `AnomalyTable`). */}
      <Link
        className={styles.link}
        href={`/meter/${encodeURIComponent(meterId)}`}
      >
        {meterId}
      </Link>
      {isLoading ? (
        // The link above is already rendered, so navigation never waits on the
        // detail request.
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      ) : error ? (
        // Deliberately no retry control: a button would be a second tab stop
        // and the card must expose exactly one. The id link stays usable.
        <Text type="secondary">No se pudo cargar el detalle.</Text>
      ) : data ? (
        <div className={styles.details}>
          <div className={styles.row}>
            <Text type="secondary">Estado</Text>
            <Text>{meterStatusLabel(data.status)}</Text>
          </div>
          <div className={styles.row}>
            <Text type="secondary">Última lectura</Text>
            <Text>{formatDateTime(data.last_reading_at)}</Text>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export default MeterCard;

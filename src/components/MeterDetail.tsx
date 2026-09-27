"use client";

import Link from "next/link";
import { Card, Descriptions, Result, Skeleton, Space } from "antd";
import type { DescriptionsProps } from "antd";

import { useGetMeterDetailQuery } from "../features/api/apiSlice";
import { formatDateTime } from "./formatters";
import {
  RequestError,
  requestErrorMessage,
  REQUEST_ERROR_FALLBACK,
} from "./RequestError";

interface MeterDetailProps {
  meterId: string;
}

/**
 * Mirrors the anomaly-detail pattern: RTK Query / Axios expose the HTTP status
 * as `status` (the transformed value) or `originalStatus` (the raw one), and an
 * unknown meter must read as a not-found state rather than a generic failure.
 */
function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const { status, originalStatus } = error as {
    status?: unknown;
    originalStatus?: unknown;
  };
  return status === 404 || originalStatus === 404;
}

export default function MeterDetail({ meterId }: MeterDetailProps) {
  const { data, error, isLoading, isFetching, refetch } =
    useGetMeterDetailQuery(meterId);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (isNotFound(error)) {
    return (
      <Result
        status="404"
        title="Medidor no encontrado"
        subTitle={`No existe un medidor con el id "${meterId}".`}
        extra={<Link href="/meters">Volver a medidores</Link>}
      />
    );
  }

  if (error) {
    return (
      <RequestError
        title="No se pudo cargar el medidor"
        description={requestErrorMessage(error, REQUEST_ERROR_FALLBACK)}
        onRetry={() => {
          void refetch();
        }}
        retrying={isFetching}
      />
    );
  }

  if (!data) return null;

  // Flow links use the canonical `meter_id` from the payload (the value the
  // backend keys meters by), not the raw route segment, so the readings page
  // and the pre-filtered anomaly list always address the same record.
  const readingsHref = `/meter/${data.meter_id}/readings`;
  const anomaliesHref = `/anomalies?meter_id=${encodeURIComponent(
    data.meter_id,
  )}`;

  // `name` and `location` are always `""` in the current backend response, so
  // the card renders the metadata the contract actually populates.
  const items: DescriptionsProps["items"] = [
    { key: "id", label: "ID", children: data.id },
    { key: "meter_id", label: "Meter ID", children: data.meter_id },
    { key: "status", label: "Status", children: data.status },
    {
      key: "readings_count",
      label: "Readings count",
      children: data.readings_count,
    },
    {
      key: "created_at",
      label: "Created at",
      children: formatDateTime(data.created_at),
    },
    {
      key: "last_reading_at",
      label: "Last reading at",
      children: formatDateTime(data.last_reading_at),
    },
  ];

  return (
    <Card
      aria-live="polite"
      extra={
        <Space>
          <Link href={readingsHref}>View readings</Link>
          <Link href={anomaliesHref}>View anomalies</Link>
        </Space>
      }
    >
      <Descriptions
        title="Meter Details"
        bordered
        column={1}
        role="region"
        aria-label="Meter details"
        items={items}
      />
    </Card>
  );
}

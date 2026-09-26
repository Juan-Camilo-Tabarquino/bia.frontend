"use client";

import Link from 'next/link';
import { Spin, Descriptions, Card, Space } from 'antd';

import { useGetMeterDetailQuery } from '../features/api/apiSlice';

interface MeterDetailProps {
  meterId: string;
}

export default function MeterDetail({ meterId }: MeterDetailProps) {
  const { data, error, isLoading } = useGetMeterDetailQuery(meterId);

  if (isLoading) return <Spin />;
  if (error)
    return (
      <div>
        {((error as unknown) as { message?: string }).message ??
          'Error loading meter'}
      </div>
    );
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
      >
        <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
        <Descriptions.Item label="Meter ID">
          {data.meter_id}
        </Descriptions.Item>
        <Descriptions.Item label="Status">{data.status}</Descriptions.Item>
        <Descriptions.Item label="Readings count">
          {data.readings_count}
        </Descriptions.Item>
        <Descriptions.Item label="Created at">
          {data.created_at}
        </Descriptions.Item>
        <Descriptions.Item label="Last reading at">
          {data.last_reading_at}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

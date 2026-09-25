"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { DatePicker, Row, Col, Typography } from "antd";
import "antd/dist/reset.css"; // ensure antd styles
import { useGetMeterReadingsQuery } from "@/features/data/dataAPI";
import { useGetAnomaliesQuery } from "@/features/api/apiSlice";
import { anomalyTypeLabels } from "@/components/anomalies/anomalyLabels";
import ReadingsChart, {
  type ReadingAnomalyMarker,
} from "@/components/dashboard/ReadingsChart";
import ReadingsTable from "@/components/dashboard/ReadingsTable";

const { RangePicker } = DatePicker;

export default function MeterReadingsPage() {
  const { id } = useParams();
  const meterId = id as string;

  // The backend reads RFC3339 `from`/`to` query params.
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
  } = useGetMeterReadingsQuery(
    {
      meterId,
      ...(from && to ? { from, to } : {}),
    },
    { skip: !meterId },
  );

  const { data: anomalies } = useGetAnomaliesQuery();

  // The backend answers `200 null` for an unknown meter or an empty window, so
  // the payload is narrowed once here instead of at every consumer. The rows go
  // to the chart and the table untouched: the DTO already carries the four
  // signals under their Go wire names, so there is no `Consumption -> value`
  // collapse and no field ever has to be re-invented.
  const rows = data ?? [];

  // `GET /api/anomalies` has no per-meter query, so the markers are a client-side
  // derivation: the full list is filtered by `meter_id` and only the detection
  // timestamp plus a human-readable label reach the chart. The API exposes no
  // baseline (no mean, stddev or change percentage), so this page draws no
  // baseline band and no delta line; the chart marks detected anomalies only.
  const anomalyMarkers: ReadingAnomalyMarker[] = (anomalies ?? [])
    .filter((anomaly) => anomaly.meter_id === meterId)
    .map((anomaly) => ({
      id: anomaly.id,
      detectedAt: anomaly.detected_at,
      label: `${anomaly.severity} · ${anomalyTypeLabels[anomaly.type]}`,
    }));

  return (
    <Row gutter={[16, 16]} style={{ padding: "1rem" }}>
      <Col xs={24}>
        <Typography.Title level={1}>
          Meter Readings for {meterId}
        </Typography.Title>
      </Col>
      <Col xs={24}>
        <RangePicker
          aria-label="Readings date range"
          onChange={(values) => {
            const fromValue = values?.[0];
            const toValue = values?.[1];
            if (fromValue && toValue) {
              setFrom(fromValue.toISOString());
              setTo(toValue.toISOString());
            } else {
              setFrom(null);
              setTo(null);
            }
          }}
          style={{ marginBottom: "1rem" }}
        />
      </Col>
      {error && (
        <Col xs={24}>
          <p style={{ color: "red" }}>Error loading readings</p>
        </Col>
      )}
      <Col xs={24}>
        <section aria-label={`Readings chart for meter ${meterId}`}>
          <ReadingsChart
            data={rows}
            anomalyMarkers={anomalyMarkers}
            loading={isLoading}
          />
        </section>
      </Col>
      <Col xs={24}>
        <section aria-label={`Readings table for meter ${meterId}`}>
          <ReadingsTable data={rows} loading={isLoading} />
        </section>
      </Col>
    </Row>
  );
}

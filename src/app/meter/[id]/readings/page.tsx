"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Col, DatePicker, Row, Space, Spin, Typography } from "antd";
import { useGetMeterReadingsQuery } from "@/features/data/dataAPI";
import { useGetAnomaliesQuery } from "@/features/api/apiSlice";
import { anomalyTypeLabels } from "@/components/anomalies/anomalyLabels";
import ReadingsChart, {
  type ReadingAnomalyMarker,
} from "@/components/dashboard/ReadingsChart";
import ReadingsTable from "@/components/dashboard/ReadingsTable";
import {
  RequestError,
  requestErrorMessage,
  REQUEST_ERROR_FALLBACK,
} from "@/components/RequestError";

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function MeterReadingsPage() {
  const { id } = useParams();
  const meterId = id as string;

  // The backend reads RFC3339 `from`/`to` query params.
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
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
  // derivation: the full list is filtered by `meter_id`, and the detection
  // timestamp, a human-readable label and the statistical `baseline.mean` (mean
  // consumption in kWh) are forwarded to the chart. The backend carries no delta
  // line, so none is drawn; the baseline feeds the chart's reference line.
  const anomalyMarkers: ReadingAnomalyMarker[] = (anomalies ?? [])
    .filter((anomaly) => anomaly.meter_id === meterId)
    .map((anomaly) => ({
      id: anomaly.id,
      detectedAt: anomaly.detected_at,
      label: `${anomaly.severity} · ${anomalyTypeLabels[anomaly.type]}`,
      baselineMean: anomaly.baseline.mean,
    }));

  // Changing the date range keeps the previous cache entry's `data` while the
  // new request is in flight (RTK Query: `isLoading` is false because data
  // exists, `isFetching` is true). The chart and table therefore keep the old
  // rows visible, and this line is what makes the refresh perceivable.
  const showUpdating = isFetching && !isLoading;

  return (
    <Row gutter={[16, 16]} style={{ padding: "1rem" }}>
      <Col xs={24}>
        <Typography.Title level={1}>
          Lecturas del medidor {meterId}
        </Typography.Title>
      </Col>
      <Col xs={24}>
        <Space align="center" wrap>
          <RangePicker
            aria-label="Rango de fechas de lecturas"
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
          />
          {showUpdating && (
            <Space size="small" role="status">
              <Spin size="small" />
              <Text type="secondary">Actualizando…</Text>
            </Space>
          )}
        </Space>
      </Col>
      {error && (
        <Col xs={24}>
          <RequestError
            title="No se pudieron cargar las lecturas"
            description={requestErrorMessage(error, REQUEST_ERROR_FALLBACK)}
            onRetry={() => {
              void refetch();
            }}
            retrying={isFetching}
          />
        </Col>
      )}
      <Col xs={24}>
        <section aria-label={`Gráfico de lecturas del medidor ${meterId}`}>
          <ReadingsChart
            data={rows}
            anomalyMarkers={anomalyMarkers}
            loading={isLoading}
          />
        </section>
      </Col>
      <Col xs={24}>
        <section aria-label={`Tabla de lecturas del medidor ${meterId}`}>
          <ReadingsTable data={rows} loading={isLoading} />
        </section>
      </Col>
    </Row>
  );
}

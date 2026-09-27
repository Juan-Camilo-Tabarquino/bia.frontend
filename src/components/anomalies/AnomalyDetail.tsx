"use client";

import Link from "next/link";
import { Card, Descriptions, Space, Tag, Typography } from "antd";
import type { Anomaly, AnomalyStatus, CorrelatedEvent } from "@/types/backend";
import { AnomalyTypeTag } from "./AnomalyTypeTag";
import { AnomalyNarrative } from "./AnomalyNarrative";
import { DataQualityNotice } from "./DataQualityNotice";
import {
  anomalySeverityLabels,
  anomalyStatusLabels,
  isDataQuality,
  severityColors,
} from "./anomalyLabels";
import {
  formatConfidence,
  formatDateTime,
  formatMetric,
  formatSignedPercent,
} from "@/components/formatters";

const { Paragraph, Text } = Typography;

/** Plain-language reading of the deterministic `status` field. */
const causalReading: Record<AnomalyStatus, string> = {
  explained:
    "El pipeline correlacionó esta anomalía con una explicación, por lo que se clasifica como explicada.",
  unexplained:
    "El pipeline no encontró una explicación correlacionada, por lo que esta anomalía se clasifica como sin explicación y requiere investigación.",
};

interface AnomalyDetailProps {
  anomaly: Anomaly;
}

/**
 * Investigation view for a single anomaly.
 *
 * It renders the deterministic DTO fields plus the statistical evidence the
 * backend exposes (baseline, per-signal change percentages, correlated events
 * and the data-quality verdict). The optional LLM narrative is rendered last by
 * `AnomalyNarrative` and is additive to the deterministic fields. Every number
 * is the API value shown verbatim (only rounded for display), never re-derived
 * in the browser.
 */
export function AnomalyDetail({ anomaly }: AnomalyDetailProps) {
  const { baseline, correlated_events: correlatedEvents, data_quality } =
    anomaly;

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      {isDataQuality(anomaly.type) && <DataQualityNotice />}

      <Card title="Registro de la anomalía">
        <Descriptions
          bordered
          column={1}
          size="middle"
          aria-label="Campos de la anomalía"
          items={[
            { key: "id", label: "ID", children: anomaly.id },
            {
              key: "meter",
              label: "Medidor",
              // The meter id is the link text verbatim (never relabelled), so
              // the target stays obvious; `encodeURIComponent` mirrors the
              // meter -> anomaly precedent in `MeterDetail` so an id with a
              // reserved character addresses the same route segment on both
              // sides of the round trip.
              children: (
                <Link
                  href={`/meter/${encodeURIComponent(anomaly.meter_id)}`}
                >
                  {anomaly.meter_id}
                </Link>
              ),
            },
            {
              key: "detected_at",
              label: "Detectada",
              children: formatDateTime(anomaly.detected_at),
            },
            { key: "priority", label: "Prioridad", children: anomaly.priority },
            {
              key: "type",
              label: "Tipo",
              children: <AnomalyTypeTag type={anomaly.type} />,
            },
            {
              key: "severity",
              label: "Severidad",
              // The raw `HIGH`/`MEDIUM`/`LOW` value stays on screen next to the
              // label, because it is the exact string the API payload carries.
              children: (
                <Space size="small">
                  <Tag color={severityColors[anomaly.severity]}>
                    {anomaly.severity}
                  </Tag>
                  <Text type="secondary">
                    {anomalySeverityLabels[anomaly.severity]}
                  </Text>
                </Space>
              ),
            },
            {
              key: "confidence",
              label: "Confianza",
              children: formatConfidence(anomaly.confidence),
            },
            {
              key: "status",
              label: "Estado",
              children: anomalyStatusLabels[anomaly.status],
            },
          ]}
        />
      </Card>

      <Card title="Motivo">
        <Paragraph>{anomaly.reason}</Paragraph>
      </Card>

      <Card title="Acción / conclusión">
        <Paragraph>{anomaly.recommended_action}</Paragraph>
      </Card>

      <Card title="Línea base">
        <Paragraph type="secondary">
          Estadísticas de la ventana de línea base contra la que el evaluador
          determinístico comparó esta anomalía.
        </Paragraph>
        <Descriptions
          bordered
          column={1}
          size="middle"
          aria-label="Línea base de la anomalía"
          items={[
            {
              key: "mean",
              label: "Media de consumo (kWh)",
              children: formatMetric(baseline.mean),
            },
            {
              key: "stddev",
              label: "Desviación estándar de consumo (kWh)",
              children: formatMetric(baseline.stddev),
            },
            {
              key: "count",
              label: "Lecturas de la línea base",
              children: baseline.count,
            },
            {
              key: "voltage_mean",
              label: "Media de voltaje (V)",
              children: formatMetric(baseline.voltage_mean),
            },
            {
              key: "current_mean",
              label: "Media de corriente (A)",
              children: formatMetric(baseline.current_mean),
            },
            {
              key: "power_factor_mean",
              label: "Media del factor de potencia",
              children: formatMetric(baseline.power_factor_mean, 3),
            },
          ]}
        />
      </Card>

      <Card title="Cambio vs. la línea base">
        <Descriptions
          bordered
          column={1}
          size="middle"
          aria-label="Porcentajes de cambio de la anomalía"
          items={[
            {
              key: "consumption_change_pct",
              label: "Consumo",
              children: formatSignedPercent(anomaly.consumption_change_pct),
            },
            {
              key: "voltage_change_pct",
              label: "Voltaje",
              children: formatSignedPercent(anomaly.voltage_change_pct),
            },
            {
              key: "current_change_pct",
              label: "Corriente",
              children: formatSignedPercent(anomaly.current_change_pct),
            },
            {
              key: "power_factor_change_pct",
              label: "Factor de potencia",
              children: formatSignedPercent(anomaly.power_factor_change_pct),
            },
          ]}
        />
      </Card>

      <Card title="Eventos correlacionados">
        {correlatedEvents.length === 0 ? (
          <Paragraph>
            Ningún evento correlacionado explica esta desviación.
          </Paragraph>
        ) : (
          <ul aria-label="Eventos correlacionados">
            {correlatedEvents.map((event: CorrelatedEvent) => (
              <li key={`${event.id}-${event.type}-${event.start}`}>
                <Text strong>{event.type}</Text>
                <br />
                <Text type="secondary">
                  {formatDateTime(event.start)} – {formatDateTime(event.end)}
                </Text>
                <br />
                <Text>{event.description}</Text>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Calidad de datos">
        <Descriptions
          bordered
          column={1}
          size="middle"
          aria-label="Calidad de datos de la anomalía"
          items={[
            {
              key: "flagged",
              label: "Marcado",
              children: data_quality.flagged ? "Sí" : "No",
            },
            {
              key: "reason",
              label: "Motivo",
              children:
                data_quality.reason.length > 0
                  ? data_quality.reason
                  : "No se marcó ningún problema de calidad de datos para esta anomalía.",
            },
          ]}
        />
      </Card>

      <Card title="Lectura causal">
        <Paragraph>{causalReading[anomaly.status]}</Paragraph>
        <Text type="secondary">
          Estado: {anomalyStatusLabels[anomaly.status]} ({anomaly.status})
        </Text>
      </Card>

      <AnomalyNarrative analysis={anomaly.llm_analysis} />
    </Space>
  );
}

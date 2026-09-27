"use client";

import Link from "next/link";
import { Card, Descriptions, Space, Tag, Typography } from "antd";
import type { Anomaly, AnomalyStatus, CorrelatedEvent } from "@/types/backend";
import { AnomalyTypeTag } from "./AnomalyTypeTag";
import { AnomalyNarrative } from "./AnomalyNarrative";
import { DataQualityNotice } from "./DataQualityNotice";
import {
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
    "The pipeline correlated this anomaly with an explanation, so it is classified as explained.",
  unexplained:
    "The pipeline found no correlated explanation, so this anomaly is classified as unexplained and needs investigation.",
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

      <Card title="Anomaly record">
        <Descriptions
          bordered
          column={1}
          size="middle"
          aria-label="Anomaly fields"
          items={[
            { key: "id", label: "ID", children: anomaly.id },
            {
              key: "meter",
              label: "Meter",
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
              label: "Detected at",
              children: formatDateTime(anomaly.detected_at),
            },
            { key: "priority", label: "Priority", children: anomaly.priority },
            {
              key: "type",
              label: "Type",
              children: <AnomalyTypeTag type={anomaly.type} />,
            },
            {
              key: "severity",
              label: "Severity",
              children: (
                <Tag color={severityColors[anomaly.severity]}>
                  {anomaly.severity}
                </Tag>
              ),
            },
            {
              key: "confidence",
              label: "Confidence",
              children: formatConfidence(anomaly.confidence),
            },
            {
              key: "status",
              label: "Status",
              children: anomalyStatusLabels[anomaly.status],
            },
          ]}
        />
      </Card>

      <Card title="Reason">
        <Paragraph>{anomaly.reason}</Paragraph>
      </Card>

      <Card title="Action / conclusion">
        <Paragraph>{anomaly.recommended_action}</Paragraph>
      </Card>

      <Card title="Baseline">
        <Paragraph type="secondary">
          Statistics of the baseline window the deterministic scorer compared
          this anomaly against.
        </Paragraph>
        <Descriptions
          bordered
          column={1}
          size="middle"
          aria-label="Anomaly baseline"
          items={[
            {
              key: "mean",
              label: "Consumption mean (kWh)",
              children: formatMetric(baseline.mean),
            },
            {
              key: "stddev",
              label: "Consumption stddev (kWh)",
              children: formatMetric(baseline.stddev),
            },
            {
              key: "count",
              label: "Baseline readings",
              children: baseline.count,
            },
            {
              key: "voltage_mean",
              label: "Voltage mean (V)",
              children: formatMetric(baseline.voltage_mean),
            },
            {
              key: "current_mean",
              label: "Current mean (A)",
              children: formatMetric(baseline.current_mean),
            },
            {
              key: "power_factor_mean",
              label: "Power factor mean",
              children: formatMetric(baseline.power_factor_mean, 3),
            },
          ]}
        />
      </Card>

      <Card title="Change vs baseline">
        <Descriptions
          bordered
          column={1}
          size="middle"
          aria-label="Anomaly change percentages"
          items={[
            {
              key: "consumption_change_pct",
              label: "Consumption",
              children: formatSignedPercent(anomaly.consumption_change_pct),
            },
            {
              key: "voltage_change_pct",
              label: "Voltage",
              children: formatSignedPercent(anomaly.voltage_change_pct),
            },
            {
              key: "current_change_pct",
              label: "Current",
              children: formatSignedPercent(anomaly.current_change_pct),
            },
            {
              key: "power_factor_change_pct",
              label: "Power factor",
              children: formatSignedPercent(anomaly.power_factor_change_pct),
            },
          ]}
        />
      </Card>

      <Card title="Correlated events">
        {correlatedEvents.length === 0 ? (
          <Paragraph>
            No correlated event explains this deviation.
          </Paragraph>
        ) : (
          <ul aria-label="Correlated events">
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

      <Card title="Data quality">
        <Descriptions
          bordered
          column={1}
          size="middle"
          aria-label="Anomaly data quality"
          items={[
            {
              key: "flagged",
              label: "Flagged",
              children: data_quality.flagged ? "Yes" : "No",
            },
            {
              key: "reason",
              label: "Reason",
              children:
                data_quality.reason.length > 0
                  ? data_quality.reason
                  : "No data-quality issue was flagged for this anomaly.",
            },
          ]}
        />
      </Card>

      <Card title="Causal reading">
        <Paragraph>{causalReading[anomaly.status]}</Paragraph>
        <Text type="secondary">
          Status: {anomalyStatusLabels[anomaly.status]} ({anomaly.status})
        </Text>
      </Card>

      <AnomalyNarrative analysis={anomaly.llm_analysis} />
    </Space>
  );
}

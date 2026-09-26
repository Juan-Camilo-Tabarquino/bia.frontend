"use client";

import { Card, Descriptions, Space, Tag, Typography } from "antd";
import type { Anomaly, AnomalyStatus, CorrelatedEvent } from "@/types/backend";
import { AnomalyTypeTag } from "./AnomalyTypeTag";
import { AnomalyNarrative } from "./AnomalyNarrative";
import { DataQualityNotice } from "./DataQualityNotice";
import {
  anomalyStatusLabels,
  formatConfidence,
  formatMetric,
  formatSignedPercent,
  isDataQuality,
  severityColors,
} from "./anomalyLabels";

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
        >
          <Descriptions.Item label="ID">{anomaly.id}</Descriptions.Item>
          <Descriptions.Item label="Meter">{anomaly.meter_id}</Descriptions.Item>
          <Descriptions.Item label="Detected at">
            {anomaly.detected_at}
          </Descriptions.Item>
          <Descriptions.Item label="Priority">
            {anomaly.priority}
          </Descriptions.Item>
          <Descriptions.Item label="Type">
            <AnomalyTypeTag type={anomaly.type} />
          </Descriptions.Item>
          <Descriptions.Item label="Severity">
            <Tag color={severityColors[anomaly.severity]}>
              {anomaly.severity}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Confidence">
            {formatConfidence(anomaly.confidence)}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {anomalyStatusLabels[anomaly.status]}
          </Descriptions.Item>
        </Descriptions>
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
        >
          <Descriptions.Item label="Consumption mean (kWh)">
            {formatMetric(baseline.mean)}
          </Descriptions.Item>
          <Descriptions.Item label="Consumption stddev (kWh)">
            {formatMetric(baseline.stddev)}
          </Descriptions.Item>
          <Descriptions.Item label="Baseline readings">
            {baseline.count}
          </Descriptions.Item>
          <Descriptions.Item label="Voltage mean (V)">
            {formatMetric(baseline.voltage_mean)}
          </Descriptions.Item>
          <Descriptions.Item label="Current mean (A)">
            {formatMetric(baseline.current_mean)}
          </Descriptions.Item>
          <Descriptions.Item label="Power factor mean">
            {formatMetric(baseline.power_factor_mean, 3)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Change vs baseline">
        <Descriptions
          bordered
          column={1}
          size="middle"
          aria-label="Anomaly change percentages"
        >
          <Descriptions.Item label="Consumption">
            {formatSignedPercent(anomaly.consumption_change_pct)}
          </Descriptions.Item>
          <Descriptions.Item label="Voltage">
            {formatSignedPercent(anomaly.voltage_change_pct)}
          </Descriptions.Item>
          <Descriptions.Item label="Current">
            {formatSignedPercent(anomaly.current_change_pct)}
          </Descriptions.Item>
          <Descriptions.Item label="Power factor">
            {formatSignedPercent(anomaly.power_factor_change_pct)}
          </Descriptions.Item>
        </Descriptions>
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
                  {event.start} – {event.end}
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
        >
          <Descriptions.Item label="Flagged">
            {data_quality.flagged ? "Yes" : "No"}
          </Descriptions.Item>
          <Descriptions.Item label="Reason">
            {data_quality.reason.length > 0
              ? data_quality.reason
              : "No data-quality issue was flagged for this anomaly."}
          </Descriptions.Item>
        </Descriptions>
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

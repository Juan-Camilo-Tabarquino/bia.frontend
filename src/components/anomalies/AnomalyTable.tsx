"use client";

import Link from "next/link";
import { Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import type {
  Anomaly,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyType,
} from "@/types/backend";
import { AnomalyTypeTag } from "./AnomalyTypeTag";
import {
  anomalyStatusLabels,
  formatConfidence,
  isDataQuality,
  severityColors,
} from "./anomalyLabels";
import styles from "./AnomalyTable.module.scss";

interface AnomalyTableProps {
  anomalies: Anomaly[];
}

/**
 * Read-only table over the already-filtered anomaly list. Row order is decided
 * by the page (API priority order by default, or the user-selected UI sort);
 * `priority` is always the API value, displayed verbatim and never re-derived.
 */
export function AnomalyTable({ anomalies }: AnomalyTableProps) {
  const columns: TableColumnsType<Anomaly> = [
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority: number) => priority,
    },
    {
      title: "Anomaly",
      dataIndex: "id",
      key: "id",
      render: (_value: string, anomaly: Anomaly) => (
        <Link href={`/anomalies/${anomaly.id}`}>{anomaly.id}</Link>
      ),
    },
    {
      title: "Meter",
      dataIndex: "meter_id",
      key: "meter_id",
    },
    {
      title: "Detected at",
      dataIndex: "detected_at",
      key: "detected_at",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: AnomalyType) => <AnomalyTypeTag type={type} />,
    },
    {
      title: "Severity",
      dataIndex: "severity",
      key: "severity",
      render: (severity: AnomalySeverity) => (
        <Tag color={severityColors[severity]}>{severity}</Tag>
      ),
    },
    {
      title: "Confidence",
      dataIndex: "confidence",
      key: "confidence",
      render: (confidence: number) => formatConfidence(confidence),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: AnomalyStatus) => anomalyStatusLabels[status],
    },
  ];

  return (
    <Table<Anomaly>
      rowKey="id"
      columns={columns}
      dataSource={anomalies}
      pagination={false}
      size="middle"
      tableLayout="auto"
      aria-label="Anomaly list"
      rowClassName={(anomaly) =>
        isDataQuality(anomaly.type) ? styles.dataQualityRow : ""
      }
    />
  );
}

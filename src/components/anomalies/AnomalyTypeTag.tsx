"use client";

import { Space, Tag, Typography } from "antd";
import type { AnomalyType } from "@/types/backend";
import {
  anomalyTypeColors,
  anomalyTypeLabels,
  isDataQuality,
} from "./anomalyLabels";
import styles from "./AnomalyTypeTag.module.scss";

const { Text } = Typography;

interface AnomalyTypeTagProps {
  type: AnomalyType;
}

/**
 * Renders the raw `type` value and its plain-language Spanish label.
 *
 * Every type now gets the label, not only `DATA_QUALITY`: the map already
 * covered all four members and only the render site was missing three of them,
 * so the raw `REAL_ANOMALY`/`EXPLAINABLE_ANOMALY`/`FALSE_POSITIVE` enum leaked
 * to the reader. The raw value stays first because a record must still match
 * the API payload; `DATA_QUALITY` keeps its `warning` styling because a
 * measurement problem is worth flagging, while the rest are informational.
 */
export function AnomalyTypeTag({ type }: AnomalyTypeTagProps) {
  return (
    <Space orientation="vertical" size={0}>
      <Tag color={anomalyTypeColors[type]}>{type}</Tag>
      <Text
        type={isDataQuality(type) ? "warning" : "secondary"}
        className={styles.plainLabel}
      >
        {anomalyTypeLabels[type]}
      </Text>
    </Space>
  );
}

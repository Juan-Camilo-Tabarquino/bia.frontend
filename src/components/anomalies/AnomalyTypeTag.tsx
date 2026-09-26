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
 * Renders the raw `type` value and, for `DATA_QUALITY`, an extra plain-language
 * label so a measurement problem is not read as a real consumption anomaly.
 */
export function AnomalyTypeTag({ type }: AnomalyTypeTagProps) {
  if (isDataQuality(type)) {
    return (
      <Space orientation="vertical" size={0}>
        <Tag color={anomalyTypeColors[type]}>{type}</Tag>
        <Text type="warning" className={styles.plainLabel}>
          {anomalyTypeLabels[type]}
        </Text>
      </Space>
    );
  }

  return <Tag color={anomalyTypeColors[type]}>{type}</Tag>;
}

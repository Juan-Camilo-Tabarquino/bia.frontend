"use client";

import { Alert } from "antd";

/**
 * Block-level explanation for `DATA_QUALITY` records: they describe a problem
 * with the measurements, not a consumption anomaly.
 */
export function DataQualityNotice() {
  return (
    <Alert
      type="warning"
      showIcon
      title="Data quality issue"
      description="This record flags a problem with the meter measurements (bad or missing readings). It is not a real consumption anomaly, so investigate the measurement, not the consumption."
      role="note"
      aria-label="Data quality issue explanation"
    />
  );
}

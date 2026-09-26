"use client";

import { Button, DatePicker, Select, Typography } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type {
  AnomalySeverity,
  AnomalyStatus,
  AnomalyType,
} from "@/types/backend";
import {
  emptyAnomalyFilters,
  hasActiveFilters,
  type AnomalyFilterValues,
} from "./anomalyFiltering";
import {
  anomalySeverities,
  anomalyStatuses,
  anomalyTypeLabels,
  anomalyTypes,
} from "./anomalyLabels";
import styles from "./AnomalyFilters.module.scss";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const typeOptions = anomalyTypes.map((value: AnomalyType) => ({
  value,
  label: anomalyTypeLabels[value],
}));

const severityOptions = anomalySeverities.map((value: AnomalySeverity) => ({
  value,
  label: value,
}));

const statusOptions = anomalyStatuses.map((value: AnomalyStatus) => ({
  value,
  label: value,
}));

interface AnomalyFiltersProps {
  meters: string[];
  values: AnomalyFilterValues;
  onChange: (values: AnomalyFilterValues) => void;
}

/**
 * Filter controls for the anomaly list.
 *
 * Every callback mutates only the local filter state; nothing here is sent to
 * the API. `GET /api/anomalies` returns the full unsorted array with no query
 * parameters, so the page filters the fetched list in the browser.
 */
export function AnomalyFilters({
  meters,
  values,
  onChange,
}: AnomalyFiltersProps) {
  const meterOptions = meters.map((meterId) => ({
    value: meterId,
    label: meterId,
  }));

  const rangeValue: [Dayjs, Dayjs] | null =
    values.detectedFrom !== null && values.detectedTo !== null
      ? [dayjs(values.detectedFrom), dayjs(values.detectedTo)]
      : null;

  return (
    <div className={styles.filters} role="group" aria-label="Anomaly filters">
      <div className={styles.field}>
        <label className={styles.label} htmlFor="anomaly-filter-meter">
          Meter
        </label>
        <Select
          id="anomaly-filter-meter"
          aria-label="Filter by meter"
          allowClear
          showSearch
          placeholder="All meters"
          className={styles.control}
          value={values.meterId ?? undefined}
          options={meterOptions}
          onChange={(meterId) =>
            onChange({ ...values, meterId: meterId ?? null })
          }
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="anomaly-filter-type">
          Type
        </label>
        <Select
          id="anomaly-filter-type"
          aria-label="Filter by type"
          allowClear
          placeholder="All types"
          className={styles.control}
          value={values.type ?? undefined}
          options={typeOptions}
          onChange={(type) => onChange({ ...values, type: type ?? null })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="anomaly-filter-severity">
          Severity
        </label>
        <Select
          id="anomaly-filter-severity"
          aria-label="Filter by severity"
          allowClear
          placeholder="All severities"
          className={styles.control}
          value={values.severity ?? undefined}
          options={severityOptions}
          onChange={(severity) =>
            onChange({ ...values, severity: severity ?? null })
          }
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="anomaly-filter-status">
          Status
        </label>
        <Select
          id="anomaly-filter-status"
          aria-label="Filter by status"
          allowClear
          placeholder="All statuses"
          className={styles.control}
          value={values.status ?? undefined}
          options={statusOptions}
          onChange={(status) => onChange({ ...values, status: status ?? null })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="anomaly-filter-detected">
          Detected at
        </label>
        <RangePicker
          id="anomaly-filter-detected"
          aria-label="Filter by detected at date range"
          className={styles.control}
          value={rangeValue}
          onChange={(dates) => {
            const from = dates?.[0];
            const to = dates?.[1];
            onChange({
              ...values,
              detectedFrom: from ? from.startOf("day").toISOString() : null,
              detectedTo: to ? to.endOf("day").toISOString() : null,
            });
          }}
        />
      </div>

      <div className={styles.field}>
        <Button
          onClick={() => onChange(emptyAnomalyFilters)}
          disabled={!hasActiveFilters(values)}
        >
          Clear filters
        </Button>
      </div>

      <Text type="secondary" className={styles.note}>
        Filtering and sorting run in the browser over the fetched list. The
        anomalies endpoint returns the full, unsorted array and accepts no query
        parameters.
      </Text>
    </div>
  );
}

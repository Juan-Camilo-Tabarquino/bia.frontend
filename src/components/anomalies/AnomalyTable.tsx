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
import {
  anomalySortDefinitions,
  type AnomalySortField,
  type AnomalySortKey,
} from "./anomalyFiltering";
import styles from "./AnomalyTable.module.scss";

interface AnomalyTableProps {
  anomalies: Anomaly[];
  /**
   * The ordering the caller is currently applying to `anomalies`, normally the
   * URL-backed `sort` on `/anomalies`. Defaults to `"backend"`: the caller is
   * not sorting and the array order (the API's own priority order) is what the
   * user sees. `"backend"` is represented by **no active header arrow**, and
   * clicking the active header again returns to it.
   */
  sortKey?: AnomalySortKey;
  /**
   * Called with the ordering a header click asks for. Supplying it is what
   * makes the table header interactive; when it is absent the table renders as
   * a plain read-only preview, which is exactly what the dashboard uses. The
   * dashboard has no `useUrlState`, so it must not gain a sort affordance that
   * would leave its "priority order" caption out of sync with no state to hold
   * the change.
   */
  onSortChange?: (sortKey: AnomalySortKey) => void;
}

/** The sort fields the table can expose, derived from the single registry. */
const sortFields: readonly string[] = anomalySortDefinitions.map(
  (definition) => definition.key,
);

function isSortField(value: unknown): value is AnomalySortField {
  return typeof value === "string" && sortFields.includes(value);
}

/**
 * Read-only table over the already-filtered anomaly list.
 *
 * Row order is decided by the caller; `priority` is always the API value,
 * displayed verbatim and never re-derived. Sorting is offered through the antd
 * column headers rather than an external control, and every comparator comes
 * from `anomalySortDefinitions` — the same registry `applyAnomalySort` uses —
 * so the header and the page can never disagree about what a sort means.
 *
 * Which columns get a sorter, and why only these:
 *
 * - `priority`, `severity`, `detected_at`, `confidence` are the four triage
 *   dimensions a user actually orders by, and each has one obvious fixed
 *   direction (most urgent, most severe, most recent, most confident first).
 * - `id` and `meter_id` are identifiers, not orderings: the array already
 *   arrives in a deterministic order and alphabetising ids is a different
 *   question than "what should I look at first".
 * - `type` and `status` are categories with no natural order; offering a sort
 *   would invent a ranking the domain does not have.
 */
export function AnomalyTable({
  anomalies,
  sortKey = "backend",
  onSortChange,
}: AnomalyTableProps) {
  // A header that cannot write the sort it asks for is worse than no header:
  // interactive sorting exists only when the caller owns the state.
  const interactive = onSortChange !== undefined;

  /**
   * The antd props that make one column sortable by its registry definition.
   *
   * Every sortable column gets an explicit `sortOrder` (the active direction,
   * or `null`), which is what keeps the table **controlled**: without it antd
   * would keep a private sort state that a deep link could not override, and a
   * stale arrow would survive a navigation. A single-entry `sortDirections`
   * turns the header into a two-state toggle — turn this ordering on, or turn
   * it off back to the API order — instead of cycling through directions the
   * registry deliberately fixes.
   */
  const sorterProps = (field: AnomalySortField) => {
    if (!interactive) {
      return {};
    }
    const definition = anomalySortDefinitions.find(
      (candidate) => candidate.key === field,
    );
    if (!definition) {
      return {};
    }
    return {
      sorter: definition.compare,
      sortOrder: sortKey === field ? definition.direction : null,
      sortDirections: [definition.direction],
    };
  };

  const columns: TableColumnsType<Anomaly> = [
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority: number) => priority,
      ...sorterProps("priority"),
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
      ...sorterProps("detected_at"),
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
      ...sorterProps("severity"),
    },
    {
      title: "Confidence",
      dataIndex: "confidence",
      key: "confidence",
      render: (confidence: number) => formatConfidence(confidence),
      ...sorterProps("confidence"),
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
      onChange={(_pagination, _filters, sorter) => {
        if (!onSortChange) {
          return;
        }
        const active = Array.isArray(sorter) ? sorter[0] : sorter;
        // No active sorter (the user clicked the active header to turn it off)
        // means the untouched API order, which the URL already names `backend`.
        if (active?.order && isSortField(active.columnKey)) {
          onSortChange(active.columnKey);
          return;
        }
        onSortChange("backend");
      }}
    />
  );
}

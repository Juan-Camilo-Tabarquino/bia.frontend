"use client";

import Link from "next/link";
import { useState } from "react";
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

/**
 * Rows per page for the full list.
 *
 * Deliberately the same `pageSize` `ReadingsTable` uses, so the two tables page
 * identically. antd's own defaults are left untouched everywhere else (no
 * `showSizeChanger`, no `showQuickJumper`, no `showTotal`, no locale override),
 * which is what keeps the two paginators consistent.
 */
const DEFAULT_PAGE_SIZE = 10;

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
  /**
   * Pagination for the list.
   *
   * `undefined` (the default) resolves from what the table *is*, mirroring how
   * the sort props above are optional:
   *
   * - an interactive list (a caller passed `onSortChange`) paginates exactly
   *   like `ReadingsTable` -- page size 10, antd's own defaults -- so
   *   `/anomalies` gets pagination without passing anything;
   * - a static preview (no `onSortChange`, which is the dashboard's fixed
   *   `slice(0, 5)` overview) renders every row with **no paginator at all**.
   *   The dashboard owns no state to hold a page, so a paginator there would
   *   lead nowhere, exactly like a sort arrow would.
   *
   * Pass `false` to force a control-free table regardless, or a config to page
   * with a different size.
   */
  pagination?: { pageSize: number } | false;
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
 *
 * Pagination is client-side over the already-filtered array (the endpoint takes
 * no query parameters): the full list pages at `DEFAULT_PAGE_SIZE` rows, and a
 * static preview -- the dashboard overview -- renders every row it was given
 * with no paginator. See the `pagination` prop for the exact rule.
 */
export function AnomalyTable({
  anomalies,
  sortKey = "backend",
  onSortChange,
  pagination,
}: AnomalyTableProps) {
  // A header that cannot write the sort it asks for is worse than no header:
  // interactive sorting exists only when the caller owns the state.
  const interactive = onSortChange !== undefined;

  // See the `pagination` prop: an interactive list pages, a static preview does
  // not. An explicit `pagination` value always wins.
  const paginationConfig =
    pagination !== undefined
      ? pagination
      : interactive
        ? { pageSize: DEFAULT_PAGE_SIZE }
        : false;

  const [pagedList, setPagedList] = useState({
    page: 1,
    // The row count the page was chosen for, so a change of list can be spotted.
    length: anomalies.length,
  });

  // The page the user is on belongs to the set of rows it was drawn from. That
  // set changes whenever the caller's filters or sort produce a different list
  // (or a refetch changes the count), and the old page can stop existing -- page
  // 3 of a result set that just shrank to 4 rows. Resetting to the first page is
  // the honest destination when the underlying list changes.
  //
  // This adjusts the state during render (React's documented pattern, already
  // used in `AnomalyFilters`) instead of from an effect: an effect would commit
  // one stale page first, and this repo's `react-hooks` rules reject a
  // synchronous `setState` in an effect body outright. Keying on the row COUNT,
  // a primitive, makes it a one-shot adjustment -- the dashboard rebuilds its
  // preview array with `slice()` on every render, so an identity-keyed check
  // could never settle.
  const listChanged = pagedList.length !== anomalies.length;
  if (listChanged) {
    setPagedList({ page: 1, length: anomalies.length });
  }

  // The render that adjusts the state still holds the OLD `pagedList`, so fall
  // back to page 1 immediately rather than showing a page that was just
  // invalidated. (antd also clamps an out-of-range `current`, e.g. when the page
  // size changes under a fixed row count; this makes the reset part of this
  // component's own output instead of an antd side effect.)
  const currentPage = listChanged ? 1 : pagedList.page;

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
      // The second link in the row. It lives in its own cell as a sibling of
      // the `Anomaly` link, never nested inside it, and keeps the meter id as
      // its text, so the two links have distinct accessible names and each
      // reaches one destination. `encodeURIComponent` matches the anomaly
      // detail page and `MeterDetail`'s existing anomaly link, so the round
      // trip encodes the id the same way in both directions.
      render: (_value: string, anomaly: Anomaly) => (
        <Link href={`/meter/${encodeURIComponent(anomaly.meter_id)}`}>
          {anomaly.meter_id}
        </Link>
      ),
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
      pagination={
        paginationConfig === false
          ? false
          : { pageSize: paginationConfig.pageSize, current: currentPage }
      }
      size="middle"
      tableLayout="auto"
      aria-label="Anomaly list"
      rowClassName={(anomaly) =>
        isDataQuality(anomaly.type) ? styles.dataQualityRow : ""
      }
      onChange={(paginationInfo, _filters, sorter) => {
        // antd reports the page the user navigated to alongside any sort change.
        if (typeof paginationInfo.current === "number") {
          setPagedList({
            page: paginationInfo.current,
            length: anomalies.length,
          });
        }
        if (!onSortChange) {
          return;
        }
        const active = Array.isArray(sorter) ? sorter[0] : sorter;
        // No active sorter (the user clicked the active header to turn it off)
        // means the untouched API order, which the URL already names `backend`.
        const nextSort: AnomalySortKey =
          active?.order && isSortField(active.columnKey)
            ? active.columnKey
            : "backend";
        // antd funnels pagination and sorting through this one callback. Only
        // report an ORDERING change: a page click carries the ordering that is
        // already active, and reporting it (or defaulting it to `backend`) here
        // would rewrite -- or silently drop -- the sort the user chose just
        // because they moved to the next page.
        if (nextSort !== sortKey) {
          onSortChange(nextSort);
        }
      }}
    />
  );
}

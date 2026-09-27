"use client";

import { useEffect, useRef, useState } from "react";
import { Button, DatePicker, Input, Select, Typography } from "antd";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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

interface AnomalySearchInputProps {
  /** The committed term plus the reset counter, both owned by the caller. */
  search: { text: string; resetToken: number };
  onTextChange: (next: string) => void;
}

/**
 * Debounced search box.
 *
 * The typed text lives in the caller and only the *commit* is debounced. The
 * reset is an explicit `resetToken` in the same state object, never inferred:
 * clearing the filters while a draft is pending sets `text` to `""` when it was
 * already `""`, so an inferred reset would have no change to observe. A counter
 * always differs, so the box can never miss the event.
 */
function AnomalySearchInput({ search, onTextChange }: AnomalySearchInputProps) {
  // An external reset clears the box during the render, so it happens before any
  // pending debounce can publish. The token lives in state, not a ref, because a
  // ref cannot be written during a render.
  const [seenToken, setSeenToken] = useState(search.resetToken);

  if (seenToken !== search.resetToken) {
    setSeenToken(search.resetToken);
    if (search.text !== "") {
      onTextChange("");
    }
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="anomaly-filter-search">
        Buscar
      </label>
      <Input
        id="anomaly-filter-search"
        aria-label="Buscar anomalías"
        allowClear
        placeholder="Buscar por id, medidor, motivo o acción"
        className={styles.control}
        value={search.text}
        onChange={(event) => onTextChange(event.target.value)}
      />
    </div>
  );
}

interface AnomalyFiltersProps {
  meters: string[];
  values: AnomalyFilterValues;
  /**
   * Applies a PATCH over the current filters. Taking a partial rather than a
   * whole snapshot is what lets concurrent changes compose: the debounced
   * search publishes from a timer, so a full-snapshot callback would overwrite
   * whatever the user changed in between with the values captured when the
   * timer was scheduled.
   */
  onChange: (patch: Partial<AnomalyFilterValues>) => void;
}

/**
 * Filter controls for the anomaly list.
 *
 * Every callback mutates only the local filter state; nothing here is sent to
 * the API. `GET /api/anomalies` returns the full array and accepts no query
 * parameters, so the page filters the fetched list in the browser. The array
 * arrives in the backend's deterministic priority order and nothing here
 * re-sorts or re-derives it.
 */
export function AnomalyFilters({
  meters,
  values,
  onChange,
}: AnomalyFiltersProps) {
  // The typed text lives here so a reset cannot race a private draft. The commit
  // is debounced; the reset is immediate and carries its own counter.
  const [typed, setTyped] = useState(values.search.text);
  const debouncedTyped = useDebouncedValue(typed);
  const lastPublished = useRef(values.search.text);
  // The token is preserved, never incremented, from this effect: typing is not a
  // reset. It is read through a ref so the timer-driven effect does not have to
  // re-subscribe whenever the token changes.
  const tokenRef = useRef(values.search.resetToken);
  useEffect(() => {
    tokenRef.current = values.search.resetToken;
  }, [values.search.resetToken]);
  const currentToken = () => tokenRef.current;

  useEffect(() => {
    const normalized = debouncedTyped.trim();
    if (normalized === lastPublished.current) {
      return;
    }
    lastPublished.current = normalized;
    // Publish ONLY the search field, so a filter the user changed while this
    // timer was pending is not overwritten by a stale snapshot.
    onChange({ search: { text: normalized, resetToken: currentToken() } });
    // Deliberately keyed on the settled text only: re-running on every parent
    // render would republish a stale term.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTyped]);

  // Adopt a term that changed from outside (a deep link) during the render.
  const [seenExternal, setSeenExternal] = useState(values.search.text);
  if (seenExternal !== values.search.text) {
    setSeenExternal(values.search.text);
    setTyped(values.search.text);
  }

  const clearFilters = () => {
    setTyped("");
    onChange({
      ...emptyAnomalyFilters,
      search: { text: "", resetToken: currentToken() + 1 },
    });
  };

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
      {/* Search composes with the selects through `applyAnomalyFilters` instead
          of post-filtering the array a second time. */}
      <AnomalySearchInput
        search={{ ...values.search, text: typed }}
        onTextChange={(next) => setTyped(next)}
      />

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
            onChange({ meterId: meterId ?? null })
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
          onChange={(type) => onChange({ type: type ?? null })}
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
            onChange({ severity: severity ?? null })
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
          onChange={(status) => onChange({ status: status ?? null })}
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
              detectedFrom: from ? from.startOf("day").toISOString() : null,
              detectedTo: to ? to.endOf("day").toISOString() : null,
            });
          }}
        />
      </div>

      <div className={styles.field}>
        {/* The box can hold a term the user has typed but that the debounce has
            not committed yet. In that window every committed filter is empty, so
            gating on them alone leaves "Clear filters" DISABLED while a visible
            term sits in the input: the user cannot clear what they just typed,
            and the term lands in the URL moments later. The gate therefore also
            looks at the RAW box value, not its trimmed form -- a box showing
            only spaces still has something on screen worth clearing, and its
            debounce will never commit anything. */}
        <Button
          onClick={clearFilters}
          disabled={!hasActiveFilters(values) && typed.length === 0}
        >
          Clear filters
        </Button>
      </div>

      <Text type="secondary" className={styles.note}>
        Filtering and sorting run in the browser over the fetched list. The
        anomalies endpoint returns the full array, already in priority order,
        and accepts no query parameters.
      </Text>
    </div>
  );
}

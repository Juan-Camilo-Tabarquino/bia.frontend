"use client";
import { useMemo, useState } from "react";

import { Empty, Input, Radio, Skeleton, Space, Typography } from "antd";

import { severityRank } from "@/components/anomalies/anomalyLabels";
import {
  useGetAnomaliesQuery,
  useGetMetersQuery,
} from "@/features/api/apiSlice";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { Anomaly, MeterSummary } from "@/types/backend";

import { MeterCard } from "./MeterCard";
import styles from "./MeterList.module.scss";
import {
  RequestError,
  requestErrorMessage,
  REQUEST_ERROR_FALLBACK,
} from "./RequestError";

const { Title, Text } = Typography;

interface MeterListProps {
  /**
   * Heading level for the list title. Pass `null` when the surrounding page
   * already renders the section heading, so each page owns a single `h1`.
   */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | null;
}

/** The four buckets the filter bar exposes, named after what they show. */
export type MeterFilter = "all" | "normal" | "alert" | "critical";

/** The orderings the sort control exposes; `"backend"` is the API order. */
export type MeterSort = "backend" | "consumption" | "variation" | "severity";

/** One rendered row: a `/meters` object plus the anomaly the join found. */
export interface MeterRow {
  meter: MeterSummary;
  anomaly: Anomaly | null;
}

/**
 * Rank used for the "no anomaly" case: it must sort **after** every real
 * severity, so it is derived from the severity registry instead of hardcoded --
 * adding a fourth severity cannot leave a healthy meter ranked above it.
 */
const NO_ANOMALY_RANK = Object.keys(severityRank).length;

/**
 * Fields the search looks at. Only the id is matched, which is the single piece
 * of text a card exposes next to its stretched link, so a match is always
 * visible on the card that matched. The card's own numbers and labels come from
 * the API and are not search text.
 */
function matchesSearch(row: MeterRow, term: string): boolean {
  return row.meter.id.toLowerCase().includes(term);
}

/**
 * The bucket rule, in one place so the radio labels and the filter can never
 * disagree. The four buckets partition the list exactly: `normal` is "no
 * anomaly joined", `alert` is the two non-urgent severities, `critical` is
 * `HIGH` -- the same severity that makes an anomaly require priority attention
 * everywhere else in the app.
 */
export function matchesMeterFilter(row: MeterRow, filter: MeterFilter): boolean {
  const severity = row.anomaly?.severity ?? null;

  switch (filter) {
    case "normal":
      return severity === null;
    case "alert":
      return severity === "MEDIUM" || severity === "LOW";
    case "critical":
      return severity === "HIGH";
    case "all":
      return true;
  }
}

/** The signed variation the card shows, or `null` when there is no anomaly. */
function variationOf(row: MeterRow): number | null {
  return row.anomaly ? row.anomaly.consumption_change_pct : null;
}

function severityOf(row: MeterRow): number {
  return row.anomaly ? severityRank[row.anomaly.severity] : NO_ANOMALY_RANK;
}

/**
 * One ordering per selectable key, each in exactly one fixed direction.
 *
 * Like `anomalySortDefinitions` on the anomalies page, these are triage
 * orderings rather than a generic asc/desc toggle: biggest consumption first,
 * largest increase first, most severe first. A row with **no anomaly** always
 * sorts last, so an incomplete join can never be pushed to the head of the list
 * by a numeric accident (`-Infinity` or `NaN` would do exactly that).
 *
 * `Array.prototype.sort` is stable, so equal rows keep the order the API
 * returned them in.
 */
const meterSortDefinitions: Record<
  Exclude<MeterSort, "backend">,
  (left: MeterRow, right: MeterRow) => number
> = {
  consumption: (left, right) =>
    right.meter.consumption - left.meter.consumption,
  variation: (left, right) => {
    const leftVariation = variationOf(left);
    const rightVariation = variationOf(right);
    if (leftVariation === null && rightVariation === null) {
      return 0;
    }
    if (leftVariation === null) {
      return 1;
    }
    if (rightVariation === null) {
      return -1;
    }
    return rightVariation - leftVariation;
  },
  severity: (left, right) => severityOf(left) - severityOf(right),
};

/**
 * Joins the two fetched lists **in the browser**, keyed by `meter_id`.
 *
 * `GET /api/anomalies` arrives sorted by ascending `priority` (most urgent
 * first), so the FIRST match for a meter is its most urgent anomaly, and that is
 * the row whose `severity` and `consumption_change_pct` the card reports. Taking
 * the last match instead would show the least urgent anomaly's numbers under a
 * card that also displays the meter id, which is a silent misreport.
 */
export function joinMeterAnomalies(
  meters: MeterSummary[],
  anomalies: Anomaly[],
): MeterRow[] {
  const mostUrgent = new Map<string, Anomaly>();
  for (const anomaly of anomalies) {
    if (!mostUrgent.has(anomaly.meter_id)) {
      mostUrgent.set(anomaly.meter_id, anomaly);
    }
  }

  return meters.map((meter) => ({
    meter,
    anomaly: mostUrgent.get(meter.id) ?? null,
  }));
}

/**
 * Meter grid.
 *
 * Two requests, no more: `GET /api/meters` (the objects, with consumption plus
 * status and last reading) and `GET /api/anomalies` (for the variation and the
 * severity badge). Everything else -- the search, the four filter buckets and
 * the three orderings -- runs over the joined array in the browser and issues
 * no request. The endpoint takes no query parameters, so this is the only place
 * the view can be narrowed.
 *
 * The join is what replaced the per-card `GET /meters/{id}`: the card no longer
 * owns a request at all, so narrowing a hundred meters to two costs the same
 * two requests it always did.
 */
export function MeterList({ headingLevel = 1 }: MeterListProps) {
  const {
    data: list = [],
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetMetersQuery();

  const { data: anomalies = [] } = useGetAnomaliesQuery();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MeterFilter>("all");
  const [sort, setSort] = useState<MeterSort>("backend");

  // `GET /api/meters` returns the whole array in the browser, so the search
  // filters that array and never issues a request. The box is debounced so the
  // filtered list settles once per pause instead of re-rendering on every
  // keystroke.
  const debouncedQuery = useDebouncedValue(query);

  const rows = useMemo(
    () => joinMeterAnomalies(list, anomalies),
    [list, anomalies],
  );

  // Search -> filter -> sort, in that order: the count below speaks about the
  // rows that survived all three, and the sort only rearranges them.
  const visibleRows = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    const searched =
      normalizedQuery.length === 0
        ? rows
        : rows.filter((row) => matchesSearch(row, normalizedQuery));
    const filtered = searched.filter((row) => matchesMeterFilter(row, filter));

    if (sort === "backend") {
      return filtered;
    }
    return [...filtered].sort(meterSortDefinitions[sort]);
  }, [rows, debouncedQuery, filter, sort]);

  // A meter is a short row of text, so the skeleton mirrors that shape instead
  // of the bare spinner that used to say nothing about what was coming.
  if (isLoading) {
    return <Skeleton active title={false} paragraph={{ rows: 4 }} />;
  }

  if (error) {
    return (
      <RequestError
        title="No se pudieron cargar los medidores"
        description={requestErrorMessage(error, REQUEST_ERROR_FALLBACK)}
        // `isLoading` is only true for the first load; a retry after a failure
        // leaves it false, so it cannot gate the button. `isFetching` is the
        // flag that is true while the user's own retry is in flight, and it is
        // what makes the action show its loading/disabled state.
        retrying={isFetching}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <Space
      orientation="vertical"
      size="large"
      role="region"
      aria-label="Medidores"
      // The grid must fill the page container rather than shrink-wrap: `Space`
      // lays out as `inline-flex`, so without this the cards would collapse to
      // their content width.
      style={{ width: "100%" }}
    >
      {headingLevel !== null && <Title level={headingLevel}>Medidores</Title>}
      {list.length === 0 ? (
        // The backend genuinely reported nothing: there is nothing to search,
        // filter or order either, so the controls would only invite an action
        // that cannot succeed.
        <Empty description="No hay medidores para mostrar." />
      ) : (
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <label htmlFor="meter-search">Buscar medidor</label>
          <Input
            id="meter-search"
            allowClear
            placeholder="Buscar por id de medidor"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {/* `fieldset`/`legend` rather than an `aria-label`: it is plain HTML,
              so the two control groups get a real accessible name without
              depending on antd forwarding an ARIA prop onto its wrapper. */}
          <div className={styles.controls}>
            <fieldset className={styles.field}>
              <legend className={styles.label}>Filtrar por anomalía</legend>
              <Radio.Group
                value={filter}
                onChange={(event) => setFilter(event.target.value as MeterFilter)}
                options={[
                  { label: "Todos", value: "all" },
                  { label: "Normales", value: "normal" },
                  { label: "Alertas", value: "alert" },
                  { label: "Críticas", value: "critical" },
                ]}
              />
            </fieldset>

            <fieldset className={styles.field}>
              <legend className={styles.label}>Ordenar por</legend>
              <Radio.Group
                value={sort}
                onChange={(event) => setSort(event.target.value as MeterSort)}
                options={[
                  { label: "Orden del backend", value: "backend" },
                  { label: "Consumo", value: "consumption" },
                  { label: "Variación", value: "variation" },
                  { label: "Severidad", value: "severity" },
                ]}
              />
            </fieldset>
          </div>

          <Text type="secondary">
            Mostrando {visibleRows.length} de {list.length} medidores.
          </Text>

          {visibleRows.length === 0 ? (
            // Distinct from the backend-empty state above: the meters exist,
            // this specific search/filter just found none of them. The message
            // names the control that actually emptied the list.
            <Empty
              description={
                query.trim().length > 0
                  ? "Ningún medidor coincide con la búsqueda."
                  : "Ningún medidor coincide con los filtros activos."
              }
            />
          ) : (
            // Only the VISIBLE rows are rendered, and a row renders no request
            // at all: the join happened once, for the whole fetched array.
            <div className={styles.grid}>
              {visibleRows.map((row) => (
                <MeterCard
                  key={row.meter.id}
                  meter={row.meter}
                  anomaly={row.anomaly}
                />
              ))}
            </div>
          )}
        </Space>
      )}
    </Space>
  );
}

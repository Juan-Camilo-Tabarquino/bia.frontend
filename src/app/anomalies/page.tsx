"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Empty, Select, Skeleton, Space, Typography } from "antd";
import {
  useGetAnomaliesQuery,
  useGetMetersQuery,
} from "@/features/api/apiSlice";
import { AiReanalysis } from "@/components/anomalies/AiReanalysis";
import { AnomalyFilters } from "@/components/anomalies/AnomalyFilters";
import { AnomalyTable } from "@/components/anomalies/AnomalyTable";
import {
  anomalySortOptions,
  applyAnomalyFilters,
  applyAnomalySort,
  emptyAnomalyFilters,
  hasActiveFilters,
  type AnomalyFilterValues,
  type AnomalySortKey,
} from "@/components/anomalies/anomalyFiltering";
import {
  RequestError,
  requestErrorMessage,
  REQUEST_ERROR_FALLBACK,
} from "@/components/RequestError";

const { Title, Text } = Typography;

/**
 * `useSearchParams` reads the URL on the client, so the route is rendered
 * inside a Suspense boundary to keep the static shell prerenderable.
 */
export default function AnomaliesPage() {
  return (
    <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}>
      <AnomaliesContent />
    </Suspense>
  );
}

/**
 * Anomaly list.
 *
 * `GET /api/anomalies` returns a **bare array already sorted by ascending
 * `priority`** (then `detected_at`, then `meter_id`) and accepts **no query
 * parameters**, so every filter and the sort selector below run in the browser
 * over the fetched list. Changing a control never triggers a request. Ordering
 * by priority is what the API already does; the UI only relabels it and offers
 * optional re-sorts.
 *
 * The optional `meter_id` URL parameter is read only to pre-seed the meter
 * filter when arriving from a meter detail page; it is a local UI concern and
 * is never forwarded to the backend.
 */
function AnomaliesContent() {
  const searchParams = useSearchParams();
  const initialMeterId = searchParams?.get("meter_id") ?? null;

  const [filters, setFilters] = useState<AnomalyFilterValues>(() => ({
    ...emptyAnomalyFilters,
    meterId:
      initialMeterId !== null && initialMeterId.length > 0
        ? initialMeterId
        : null,
  }));
  const [sortKey, setSortKey] = useState<AnomalySortKey>("backend");

  const {
    data: anomalies = [],
    error: anomaliesError,
    isLoading: anomaliesLoading,
    refetch: refetchAnomalies,
  } = useGetAnomaliesQuery();

  const {
    data: meters = [],
    error: metersError,
    isLoading: metersLoading,
  } = useGetMetersQuery();

  const visibleAnomalies = useMemo(
    () => applyAnomalySort(applyAnomalyFilters(anomalies, filters), sortKey),
    [anomalies, filters, sortKey],
  );

  if (anomaliesLoading || metersLoading) {
    // The anomaly table is the known shape, so the skeleton says what is
    // coming instead of the empty spinner that used to occupy the page.
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (anomaliesError) {
    return (
      <div style={{ padding: "1rem" }}>
        <RequestError
          title="No se pudieron cargar las anomalías"
          description={requestErrorMessage(
            anomaliesError,
            REQUEST_ERROR_FALLBACK,
          )}
          onRetry={() => {
            void refetchAnomalies();
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      <Title level={1}>Anomalies</Title>
      <p className="sr-only">
        Anomalies arrive ordered by priority (most urgent first). Filtering and
        sorting on this page run in the browser over the anomalies already
        fetched from the backend.
      </p>

      <section aria-label="Anomaly filters">
        <AnomalyFilters meters={meters} values={filters} onChange={setFilters} />
        {metersError && (
          <Alert
            type="warning"
            showIcon
            title="Lista de medidores no disponible"
            description="El filtro de medidores no se pudo completar porque la consulta de medidores falló."
            style={{ marginTop: "1rem" }}
          />
        )}
      </section>

      <section aria-label="Anomaly results" style={{ marginTop: "1.5rem" }}>
        <Space wrap size="large" style={{ marginBottom: "1rem" }}>
          <Text role="status">
            Showing {visibleAnomalies.length} of {anomalies.length} anomalies
          </Text>
          <div>
            <label htmlFor="anomaly-sort" style={{ marginRight: "0.5rem" }}>
              Sort
            </label>
            <Select<AnomalySortKey>
              id="anomaly-sort"
              aria-label="Sort anomalies, applied in the browser over the fetched list"
              value={sortKey}
              options={anomalySortOptions}
              onChange={(value) => setSortKey(value)}
              style={{ minWidth: "16rem" }}
            />
          </div>
        </Space>

        {anomalies.length === 0 ? (
          <Empty description="El backend no reportó anomalías." />
        ) : visibleAnomalies.length === 0 ? (
          <Empty description="Ninguna anomalía coincide con los filtros actuales.">
            <Button onClick={() => setFilters(emptyAnomalyFilters)}>
              Clear filters
            </Button>
          </Empty>
        ) : (
          <AnomalyTable anomalies={visibleAnomalies} />
        )}
      </section>

      <AiReanalysis />

      {hasActiveFilters(filters) && (
        <Text type="secondary" style={{ display: "block", marginTop: "1rem" }}>
          Filters are applied in the browser to the fetched array; the backend
          is not re-queried. The API already returns the array in priority
          order.
        </Text>
      )}
    </div>
  );
}

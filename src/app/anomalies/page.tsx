"use client";

import { Suspense, useMemo } from "react";
import { Alert, Button, Empty, Skeleton, Typography } from "antd";
import {
  useGetAnomaliesQuery,
  useGetMetersQuery,
} from "@/features/api/apiSlice";
import { AnomalyFilters } from "@/components/anomalies/AnomalyFilters";
import { AnomalyTable } from "@/components/anomalies/AnomalyTable";
import {
  anomalyUrlSchema,
  applyAnomalyFilters,
  applyAnomalySort,
  emptyAnomalyFilters,
  hasActiveFilters,
  type AnomalyFilterValues,
  type AnomalyUrlState,
} from "@/components/anomalies/anomalyFiltering";
import { useUrlState } from "@/hooks/useUrlState";
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
 * parameters**, so every filter and the header sort below run in the browser
 * over the fetched list. Changing a control never triggers a request. Ordering
 * by priority is what the API already does; the UI only makes that order
 * selectable and offers optional re-sorts.
 *
 * Sorting is the antd column headers (see `AnomalyTable`), not an external
 * control: a header click writes the same `sort` key this page already keeps in
 * the URL, so the chosen order is deep-linkable and a refresh restores it. The
 * header's arrow and the URL are the same value, so they cannot disagree.
 * `backend` (the API order) is the state with no arrow, and clicking the active
 * header again returns to it. The old external `Select` was removed rather than
 * kept as a second control that could drift out of sync with the header.
 *
 * The whole view is deep-linkable: `anomalyUrlSchema` reads the filters and the
 * sort key from the query string on mount (the pre-existing `?meter_id=M-109`
 * link keeps working) and every change is written back with `router.replace`,
 * so refreshing or sharing the URL restores the same view without adding a
 * history entry and without the backend ever seeing these parameters.
 *
 * Paging is client-side and stays out of the URL: the table pages the filtered
 * array at its own default size and owns the page number internally. That keeps
 * a page change from touching the filters or the sort, and the table resets to
 * page 1 whenever the filtered count changes, so a filter can never strand the
 * user on a page that no longer exists.
 */
function AnomaliesContent() {
  const [urlState, setUrlState] = useUrlState<AnomalyUrlState>(anomalyUrlSchema);

  // The URL layer only mirrors this state; the list below is still filtered and
  // ordered by the pure functions in `anomalyFiltering`.
  const filters: AnomalyFilterValues = urlState;
  const sortKey = urlState.sort;

  const {
    data: anomalies = [],
    error: anomaliesError,
    isLoading: anomaliesLoading,
    // `isLoading` is false on a retry, so only `isFetching` can tell the retry
    // action that its request is still running.
    isFetching: anomaliesFetching,
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
    // The shell container owns the horizontal gutter; keep only the vertical
    // padding so this wrapper aligns with the other routes.
    return (
      <div style={{ paddingBlock: "1rem" }}>
        <RequestError
          title="No se pudieron cargar las anomalías"
          description={requestErrorMessage(
            anomaliesError,
            REQUEST_ERROR_FALLBACK,
          )}
          retrying={anomaliesFetching}
          onRetry={() => {
            void refetchAnomalies();
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ paddingBlock: "1rem" }}>
      <Title level={1}>Anomalías</Title>
      <p className="sr-only">
        Las anomalías llegan ordenadas por prioridad (la más urgente primero).
        El filtrado y el ordenamiento de esta página se ejecutan en el navegador
        sobre las anomalías ya obtenidas del backend.
      </p>

      <section aria-label="Filtros de anomalías">
        <AnomalyFilters
          meters={meters}
          values={filters}
          onChange={(patch) =>
            setUrlState((previous) => ({ ...previous, ...patch }))
          }
        />
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

      <section aria-label="Resultados de anomalías" style={{ marginTop: "1.5rem" }}>
        {/* The list below is paginated, so this count may only speak about how
            many anomalies MATCH the filters -- the old "Showing X of Y" claimed
            every X was on screen while antd renders a single page. Keeping it as
            the match count (against the fetched total) and letting antd's
            paginator convey which page is on screen is the resolution this task
            chose: the two numbers here are both filter/total facts, and the
            paginator owns the page window, so nothing on the page can be read as
            "these many are visible" when they are not. */}
        <Text role="status" style={{ display: "block", marginBottom: "1rem" }}>
          {visibleAnomalies.length} de {anomalies.length} anomalías coinciden con
          los filtros.
        </Text>

        {anomalies.length === 0 ? (
          <Empty description="El backend no reportó anomalías." />
        ) : visibleAnomalies.length === 0 ? (
          <Empty description="Ninguna anomalía coincide con los filtros actuales.">
            {/* Named for what it clears. It sits next to the filter bar's own
                "Limpiar filtros", so the two actions must keep DIFFERENT
                accessible names: two controls with the same name make
                `getByRole("button", { name: ... })` throw for every
                assistive-technology user and test once the empty state is on
                screen. */}
            <Button
              onClick={() =>
                setUrlState((previous) => ({ ...previous, ...emptyAnomalyFilters }))
              }
            >
              Quitar filtros
            </Button>
          </Empty>
        ) : (
          <AnomalyTable
            anomalies={visibleAnomalies}
            sortKey={sortKey}
            onSortChange={(nextSortKey) =>
              setUrlState((previous) => ({ ...previous, sort: nextSortKey }))
            }
          />
        )}
      </section>

      {hasActiveFilters(filters) && (
        <Text type="secondary" style={{ display: "block", marginTop: "1rem" }}>
          Los filtros se aplican en el navegador sobre la lista obtenida; no se
          vuelve a consultar el backend. La API ya devuelve la lista en orden de
          prioridad.
        </Text>
      )}
    </div>
  );
}

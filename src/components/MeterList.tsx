"use client";
import Link from "next/link";
import { useState } from "react";

import { Empty, Input, Listy, Skeleton, Space, Typography } from "antd";

import { useGetMetersQuery } from "@/features/api/apiSlice";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

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

export function MeterList({ headingLevel = 1 }: MeterListProps) {
  const {
    data: list = [],
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetMetersQuery();
  const [query, setQuery] = useState("");

  // `GET /api/meters` returns the whole id array in the browser, so the search
  // filters that array and never issues a request. The box is debounced so the
  // filtered list (and, elsewhere, any URL state) settles once per pause
  // instead of re-rendering on every keystroke.
  const debouncedQuery = useDebouncedValue(query);

  // Case-insensitive substring matching, so `m-10` finds `M-101`. A blank or
  // whitespace-only box is not a search and shows everything.
  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const visibleMeters =
    normalizedQuery.length === 0
      ? list
      : list.filter((meterId) =>
          meterId.toLowerCase().includes(normalizedQuery),
        );

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
    >
      {headingLevel !== null && <Title level={headingLevel}>Medidores</Title>}
      {list.length === 0 ? (
        // The backend genuinely reported nothing: there is nothing to search
        // either, so the box would only invite a query that cannot succeed.
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
          <Text type="secondary">
            Mostrando {visibleMeters.length} de {list.length} medidores.
          </Text>
          {visibleMeters.length === 0 ? (
            // Distinct from the backend-empty state above: the meters exist,
            // this specific search just found none of them.
            <Empty description="Ningún medidor coincide con la búsqueda." />
          ) : (
            <Listy
              virtual={false}
              items={visibleMeters}
              rowKey={(meterId: string) => meterId}
              itemRender={(meterId: string) => (
                <Link href={`/meter/${meterId}`}>{meterId}</Link>
              )}
            />
          )}
        </Space>
      )}
    </Space>
  );
}

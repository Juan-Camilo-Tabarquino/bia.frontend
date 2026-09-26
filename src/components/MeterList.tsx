"use client";
import Link from "next/link";

import { Empty, Listy, Skeleton, Space, Typography } from "antd";

import { useGetMetersQuery } from "@/features/api/apiSlice";

import {
  RequestError,
  requestErrorMessage,
  REQUEST_ERROR_FALLBACK,
} from "./RequestError";

const { Title } = Typography;

interface MeterListProps {
  /**
   * Heading level for the list title. Pass `null` when the surrounding page
   * already renders the section heading, so each page owns a single `h1`.
   */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | null;
}

export function MeterList({ headingLevel = 1 }: MeterListProps) {
  const { data: list = [], error, isLoading, refetch } = useGetMetersQuery();

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
        <Empty description="No hay medidores para mostrar." />
      ) : (
        <Listy
          virtual={false}
          items={list}
          rowKey={(meterId: string) => meterId}
          itemRender={(meterId: string) => (
            <Link href={`/meter/${meterId}`}>{meterId}</Link>
          )}
        />
      )}
    </Space>
  );
}

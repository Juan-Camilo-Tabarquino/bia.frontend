"use client";
import Link from "next/link";

import { Spin, Listy, Typography, Space } from "antd";

import { useGetMetersQuery } from "@/features/api/apiSlice";

const { Title } = Typography;

interface MeterListProps {
  /**
   * Heading level for the list title. Pass `null` when the surrounding page
   * already renders the section heading, so each page owns a single `h1`.
   */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | null;
}

export function MeterList({ headingLevel = 1 }: MeterListProps) {
  const { data: list = [], error, isLoading } = useGetMetersQuery();

  if (isLoading) return <Spin />;
  if (error)
    return (
      <div>
        {(error as unknown as { message?: string }).message ??
          "Error loading meters"}
      </div>
    );

  return (
    <Space
      orientation="vertical"
      size="large"
      role="region"
      aria-label="Meters"
    >
      {headingLevel !== null && <Title level={headingLevel}>Meters</Title>}
      <Listy
        virtual={false}
        items={list}
        rowKey={(meterId: string) => meterId}
        itemRender={(meterId: string) => (
          <Link href={`/meter/${meterId}`}>{meterId}</Link>
        )}
      />
    </Space>
  );
}

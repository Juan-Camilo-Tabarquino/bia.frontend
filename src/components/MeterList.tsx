"use client";
import { Meter } from "../types/backend";
import { Spin, List, Typography } from 'antd';
import { useGetMetersQuery } from '../features/api/apiSlice';
import '@/styles/globals.scss';

const { Title } = Typography;

export function MeterList() {
  const { data: list = [], error, isLoading } = useGetMetersQuery();

  if (isLoading) return <Spin />;
  if (error) return <div>{((error as unknown) as { message?: string }).message ?? 'Error loading meters'}</div>;

  return (
    <div>
      <Title level={3}>Meters</Title>
      <List
        bordered
        dataSource={list}
        aria-label="Meter list"
        renderItem={(meter: Meter) => <List.Item>{meter.id}</List.Item>}
      />
    </div>
  );
}

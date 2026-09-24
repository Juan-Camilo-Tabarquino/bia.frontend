"use client";

import { Descriptions, Spin } from 'antd';
import { useGetAnalysisQuery } from '../../features/api/apiSlice';

export default function DashboardPage() {
  const { data, error, isLoading } = useGetAnalysisQuery({});

  if (isLoading) return <Spin />;
  if (error) return <div>{(error as any).message ?? 'Error loading analysis'}</div>;

  return (
    <div>
      <Descriptions title="Dashboard Analysis" bordered column={1}>
        {Object.entries(data ?? {}).map(([k, v]) => (
          <Descriptions.Item key={k} label={k}>
            {String(v)}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </div>
  );
}

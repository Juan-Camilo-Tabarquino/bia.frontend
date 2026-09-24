"use client";

import { Descriptions, Spin } from 'antd';
import ChartPanel from '../../components/dashboard/ChartPanel';
import Analyzer from '../../components/dashboard/Analyzer';
import ToolProof from '../../components/dashboard/ToolProof';
import { useGetAnalysisQuery } from '../../features/api/apiSlice';

export default function DashboardPage() {
  const { data, error, isLoading } = useGetAnalysisQuery({});

  if (isLoading) return <Spin />;
  if (error) return <div>{(error as any).message ?? 'Error loading analysis'}</div>;

  return (
    <div>
      {/* Chart Panel */}
      <ChartPanel data={data?.chartData ?? []} />
      {/* Analyzer */}
      <Analyzer summary={data?.summary ?? ''} anomalies={data?.anomalies ?? []} />
      {/* Tool Proof */}
      <ToolProof toolName="Analysis Tool" output={data?.toolOutput ?? data} />
    </div>
  );
}

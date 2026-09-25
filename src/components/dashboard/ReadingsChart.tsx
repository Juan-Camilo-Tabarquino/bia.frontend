"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Spin } from "antd";
import './ReadingsChart.module.scss';

interface ReadingsChartProps {
  data: Array<{ timestamp: string; value: number }>;
  loading?: boolean;
}

export default function ReadingsChart({ data, loading }: ReadingsChartProps) {
  if (loading) {
    return <Spin tip="Loading chart..." />;
  }

  return (
    <ResponsiveContainer width="100%" height={300} aria-label="Readings chart" role="img">
      <LineChart data={data}>
        <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#0064c8" />
      </LineChart>
    </ResponsiveContainer>
  );
}

"use client";

import './ChartPanel.module.scss';
import '@/styles/globals.scss';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartPanelProps {
  data: Array<{ timestamp: string; value: number }>;
}

export default function ChartPanel({ data }: ChartPanelProps) {
  return (
    <ResponsiveContainer width="100%" height={300} aria-label="Chart panel" role="img">
      <LineChart data={data}>
        <XAxis dataKey="timestamp" tick={{ fontSize: 12 }}></XAxis>
        <YAxis tick={{ fontSize: 12 }}></YAxis>
        <Tooltip></Tooltip>
        <Line type="monotone" dataKey="value" stroke="#0064c8"/>
      </LineChart>
    </ResponsiveContainer>
  );
}

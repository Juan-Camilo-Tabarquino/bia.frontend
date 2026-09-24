"use client";

import './Analyzer.module.scss';
import '@/styles/globals.scss';
import { Card, Typography } from 'antd';

const { Text } = Typography;

interface AnalyzerProps {
  summary: string;
  anomalies: Array<{ meterId: string; severity: string }>;
}

export default function Analyzer({ summary, anomalies }: AnalyzerProps) {
  return (
    <Card title="Analysis" style={{ marginTop: 16 }} role="region" aria-live="polite">
      <p>{summary}</p>
      <hr />
      <Text strong>Anomalies</Text>
      <ul>
        {anomalies.map((a, idx) => (
          <li key={idx}>
            {a.meterId} – Severity: {a.severity}
          </li>
        ))}
      </ul>
    </Card>
  );
}

"use client";

import './MeterCard.module.scss';
import '@/styles/globals.scss';
import { Card } from 'antd';

interface MeterCardProps {
  meterId: string;
  consumption: number;
  voltage: number;
  current: number;
  powerFactor: number;
}

export default function MeterCard({
  meterId,
  consumption,
  voltage,
  current,
  powerFactor,
}: MeterCardProps) {
  return (
    <Card title={meterId} style={{ width: 300 }} role="region" aria-label={`Meter ${meterId}`}>
      <p>Consumption: {consumption} kWh</p>
      <p>Voltage: {voltage} V</p>
      <p>Current: {current} A</p>
      <p>Power Factor: {powerFactor}</p>
    </Card>
  );
}

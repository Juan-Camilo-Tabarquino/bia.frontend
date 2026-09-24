import React from 'react';
import './MeterCard.module.scss';
import '../../styles/globals.module.scss';
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
    <Card title={meterId} style={{ width: 300 }}>
      <p>Consumption: {consumption} kWh</p>
      <p>Voltage: {voltage} V</p>
      <p>Current: {current} A</p>
      <p>Power Factor: {powerFactor}</p>
    </Card>
  );
}

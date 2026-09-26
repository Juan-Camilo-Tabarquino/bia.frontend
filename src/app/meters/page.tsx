"use client";

import { MeterList } from '../../components/MeterList';
import { Typography } from 'antd';
const { Title } = Typography;
export default function MetersPage() {
  return (
    <div>
      <Title level={1}>Meters</Title>
      <MeterList headingLevel={null} />
    </div>
  );
}

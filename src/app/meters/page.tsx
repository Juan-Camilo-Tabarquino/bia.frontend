import Link from 'next/link';
import { MeterList } from '../../components/MeterList';
import { Typography } from 'antd';
const { Title } = Typography;
export default function MetersPage() {
  return (
    <div>
      <Title level={2}>Meters</Title>
      <MeterList />
    </div>
  );
}

"use client";

import '@/styles/globals.scss';
import { Spin, Descriptions } from 'antd';

import { useGetMeterDetailQuery } from '../features/api/apiSlice';


interface MeterDetailProps { meterId: string; }

 export default function MeterDetail({ meterId }: MeterDetailProps) {
  const { data, error, isLoading } = useGetMeterDetailQuery({ meterId });

  if (isLoading) return <Spin />;
  if (error) return <div>{((error as unknown) as { message?: string }).message ?? 'Error loading meter'}</div>;

  return (
    <div aria-live="polite">
      <Descriptions title="Meter Details" bordered column={1}>
        {Object.entries(data ?? {}).map(([k, v]) => (
          <Descriptions.Item key={k} label={k}>
            {String(v)}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </div>
  );
}

"use client";
import { MeterList } from '../components/MeterList';
import HealthStatus from '../components/HealthStatus';


export default function Home() {
  return (
    <div style={{ minHeight: '100vh', padding: '1rem' }}>
      <HealthStatus />
      <MeterList />
    </div>
  );
}

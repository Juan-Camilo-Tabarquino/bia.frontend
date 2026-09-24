"use client";
import { useEffect, useState } from 'react';
import '../../styles/globals.module.scss';
import { getHealth } from '../api/backend';
import { Result, Spin } from 'antd';

export default function HealthStatus() {
  const [status, setStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');
  const [loading, setLoading] = useState(true);

  const check = async () => {
    setLoading(true);
    try {
      const res = await getHealth();
      if (res.status === 200) setStatus('healthy');
      else setStatus('unhealthy');
    } catch {
      setStatus('unhealthy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Spin />;

  return (
    <Result
      status={status === 'healthy' ? 'success' : 'error'}
      title={status === 'healthy' ? 'Backend Up' : 'Backend Down'}
    />
  );
}

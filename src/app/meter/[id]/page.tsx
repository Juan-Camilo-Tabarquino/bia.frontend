"use client";
export const dynamic = "force-dynamic";
import { useParams } from 'next/navigation';
import MeterDetail from '../../../components/MeterDetail';

export default function MeterPage() {
  const { id } = useParams();
  return <MeterDetail meterId={id as string} />;
}

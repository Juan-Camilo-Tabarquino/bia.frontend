"use client";
export const dynamic = "force-dynamic";
import { useParams } from "next/navigation";
import { Typography } from "antd";
import MeterDetail from "../../../components/MeterDetail";

export default function MeterPage() {
  const { id } = useParams();
  const meterId = id as string;

  return (
    <div>
      <Typography.Title level={1}>Meter {meterId}</Typography.Title>
      <MeterDetail meterId={meterId} />
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { DatePicker } from "antd";
import "antd/dist/reset.css"; // ensure antd styles
import { useGetMeterReadingsQuery } from "@/features/data/dataAPI";
import ReadingsChart from "@/components/dashboard/ReadingsChart";
import ReadingsTable from "@/components/dashboard/ReadingsTable";

const { RangePicker } = DatePicker;

export default function MeterReadingsPage() {
  const { id } = useParams();
  const meterId = id as string;

  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const { data = [], isLoading, error } = useGetMeterReadingsQuery(
    {
      meterId,
      ...(dateRange ? { start: dateRange[0], end: dateRange[1] } : {}),
    },
    { skip: !meterId }
  );

  const handleRangeChange = (values: any, dateStrings: [string, string]) => {
    if (dateStrings[0] && dateStrings[1]) {
      setDateRange([dateStrings[0], dateStrings[1]]);
    } else {
      setDateRange(null);
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Meter Readings for {meterId}</h2>
      <RangePicker onChange={handleRangeChange} style={{ marginBottom: "1rem" }} />
      {error && <p style={{ color: "red" }}>Error loading readings</p>}
      <ReadingsChart data={data} loading={isLoading} />
      <ReadingsTable data={data} loading={isLoading} />
    </div>
  );
}

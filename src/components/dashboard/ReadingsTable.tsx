"use client";

import { Table, Spin } from "antd";
import type { TableColumnsType } from "antd";
import type { Reading } from "@/types/backend";

interface ReadingsTableProps {
  data: Reading[];
  loading?: boolean;
}

/** Column titles exactly as rendered, used for the table's accessible name. */
const signalColumnTitles = [
  "Timestamp",
  "Consumption (kWh)",
  "Voltage (V)",
  "Current (A)",
  "Power factor",
];

/**
 * Raw readings table.
 *
 * Every column maps to a wire field of the `Reading` DTO with its physical unit
 * in the header, so the four signals stay distinguishable instead of being
 * collapsed into a single anonymous value. `status` is optional on the DTO, so
 * its column only appears when at least one reading actually carries it.
 */
export default function ReadingsTable({ data, loading }: ReadingsTableProps) {
  const hasStatus = data.some(
    (reading) => typeof reading.status === "string" && reading.status.length > 0,
  );

  const columns: TableColumnsType<Reading> = [
    { title: "Timestamp", dataIndex: "Timestamp", key: "Timestamp" },
    { title: "Consumption (kWh)", dataIndex: "Consumption", key: "Consumption" },
    { title: "Voltage (V)", dataIndex: "Voltage", key: "Voltage" },
    { title: "Current (A)", dataIndex: "Current", key: "Current" },
    { title: "Power factor", dataIndex: "PowerFactor", key: "PowerFactor" },
  ];

  if (hasStatus) {
    columns.push({ title: "Status", dataIndex: "status", key: "status" });
  }

  if (loading) {
    return <Spin tip="Loading table..." />;
  }

  const columnTitles = hasStatus
    ? [...signalColumnTitles, "Status"]
    : signalColumnTitles;

  return (
    <Table<Reading>
      rowKey="Timestamp"
      columns={columns}
      dataSource={data}
      pagination={{ pageSize: 10 }}
      bordered
      size="middle"
      aria-label={`Readings table: ${columnTitles.join(", ")}`}
    />
  );
}

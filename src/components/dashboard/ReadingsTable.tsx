"use client";

import { Table, Spin } from "antd";
import './ReadingsTable.module.scss';

interface ReadingsTableProps {
  data: Array<{ timestamp: string; value: number }>;
  loading?: boolean;
}

export default function ReadingsTable({ data, loading }: ReadingsTableProps) {
  const columns = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
    },
  ];

  if (loading) {
    return <Spin tip="Loading table..." />;
  }

  return (
    <Table
      rowKey="timestamp"
      columns={columns}
      dataSource={data}
      pagination={{ pageSize: 10 }}
      bordered
    />
  );
}

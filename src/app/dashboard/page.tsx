"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import PrivateRoute from "../../components/PrivateRoute";
// The anomaly table is reused verbatim: every row links to `/anomalies/{id}`,
// so the dashboard preview stays consistent with the full list page.
import { AnomalyTable } from "@/components/anomalies/AnomalyTable";
import {
  anomalySeverities,
  anomalyTypeColors,
  anomalyTypeLabels,
  anomalyTypes,
  severityColors,
} from "@/components/anomalies/anomalyLabels";
import type {
  Anomaly,
  AnomalySeverity,
  AnomalyType,
} from "../../types/backend";
import {
  useGetAnomaliesQuery,
  useGetDashboardSummaryQuery,
} from "../../features/api/apiSlice";
import {
  RequestError,
  requestErrorMessage,
  REQUEST_ERROR_FALLBACK,
} from "../../components/RequestError";

const { Text, Title } = Typography;

/**
 * Number of anomaly rows previewed on the dashboard. The full, filterable and
 * sortable list lives on `/anomalies`; this page only summarises.
 */
const OVERVIEW_LIMIT = 5;

/** Number of KPI cards the loading skeleton mirrors. */
const KPI_CARD_COUNT = 4;

function countTypes(anomalies: Anomaly[]): Map<AnomalyType, number> {
  const counts = new Map<AnomalyType, number>();
  for (const anomaly of anomalies) {
    counts.set(anomaly.type, (counts.get(anomaly.type) ?? 0) + 1);
  }
  return counts;
}

function countSeverities(anomalies: Anomaly[]): Map<AnomalySeverity, number> {
  const counts = new Map<AnomalySeverity, number>();
  for (const anomaly of anomalies) {
    counts.set(anomaly.severity, (counts.get(anomaly.severity) ?? 0) + 1);
  }
  return counts;
}

/**
 * Deterministic dashboard.
 *
 * KPIs come from `GET /api/dashboard/summary` and the anomaly overview from
 * `GET /api/anomalies`. There is no LLM step on mount: the narrative is a later
 * increment, so this page never triggers an analysis request and never renders
 * the optional LLM narrative field.
 */
export default function DashboardPage() {
  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useGetDashboardSummaryQuery();

  const {
    data: anomalies = [],
    error: anomaliesError,
    isLoading: anomaliesLoading,
    isFetching: anomaliesFetching,
    refetch: refetchAnomalies,
  } = useGetAnomaliesQuery();

  // The summary endpoint reports only totals (`health`, `meters`, `anomalies`,
  // `lastRun`): it exposes no `by_type` or `by_severity` breakdown. Every
  // per-category count below is therefore derived in the browser from the
  // fetched `GET /api/anomalies` array.
  const typeCounts = useMemo(() => countTypes(anomalies), [anomalies]);
  const severityCounts = useMemo(() => countSeverities(anomalies), [anomalies]);
  const overview = anomalies.slice(0, OVERVIEW_LIMIT);

  const isLoading = summaryLoading || anomaliesLoading;
  const error = summaryError ?? anomaliesError;

  return (
    <PrivateRoute>
      <div style={{ padding: "1rem" }}>
        <Title level={1}>Dashboard</Title>
        <p className="sr-only">
          Key indicators for the latest deterministic run and a preview of the
          detected anomalies, which arrive from the API ordered by priority
          (most urgent first). Per-type and per-severity counts are computed in
          the browser from the fetched anomaly list.
        </p>

        {isLoading ? (
          // The KPI row is a known shape, so the loading state mirrors it with
          // placeholder cards instead of a single unlabelled spinner.
          <Row gutter={[16, 16]}>
            {Array.from({ length: KPI_CARD_COUNT }, (_unused, index) => (
              <Col key={index} xs={24} sm={12} lg={6}>
                <Card>
                  <Skeleton active title={false} paragraph={{ rows: 1 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : error ? (
          <RequestError
            title="No se pudo cargar el panel"
            description={requestErrorMessage(error, REQUEST_ERROR_FALLBACK)}
            onRetry={() => {
              void refetchSummary();
              void refetchAnomalies();
            }}
            retrying={summaryFetching || anomaliesFetching}
          />
        ) : (
          <>
            <section aria-label="Key indicators">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="Health" value={summary?.health ?? "—"} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="Meters" value={summary?.meters ?? "—"} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Anomalies"
                      value={summary?.anomalies ?? anomalies.length}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="Last run" value={summary?.lastRun ?? "—"} />
                  </Card>
                </Col>
              </Row>
            </section>

            <section
              aria-label="Anomaly overview"
              style={{ marginTop: "1.5rem" }}
            >
              <Card
                title="Anomaly overview"
                extra={
                  <Space>
                    <Link href="/meters">Browse meters</Link>
                    <Button type="primary" href="/anomalies">
                      View all anomalies
                    </Button>
                  </Space>
                }
              >
                <Space
                  orientation="vertical"
                  size="middle"
                  style={{ width: "100%" }}
                >
                  <div>
                    <Text strong>By type</Text>
                    <section
                      aria-label="Anomaly counts by type"
                      style={{ marginTop: "0.5rem" }}
                    >
                      <Space wrap>
                        {anomalyTypes.map((type) => {
                          const count = typeCounts.get(type) ?? 0;
                          if (count === 0) return null;
                          return (
                            <Tag key={type} color={anomalyTypeColors[type]}>
                              {anomalyTypeLabels[type]}: {count}
                            </Tag>
                          );
                        })}
                      </Space>
                    </section>
                  </div>

                  <div>
                    <Text strong>By severity</Text>
                    <section
                      aria-label="Anomaly counts by severity"
                      style={{ marginTop: "0.5rem" }}
                    >
                      <Space wrap>
                        {anomalySeverities.map((severity) => {
                          const count = severityCounts.get(severity) ?? 0;
                          if (count === 0) return null;
                          return (
                            <Tag
                              key={severity}
                              color={severityColors[severity]}
                            >
                              {severity}: {count}
                            </Tag>
                          );
                        })}
                      </Space>
                    </section>
                  </div>

                  <Text type="secondary">
                    Counts are derived in the browser from the fetched anomaly
                    list; the summary endpoint only reports totals.
                  </Text>

                  {anomalies.length === 0 ? (
                    <Empty description="No anomalies reported." />
                  ) : (
                    <>
                      <AnomalyTable anomalies={overview} />
                      {anomalies.length > overview.length && (
                        <Text type="secondary">
                          Showing the first {overview.length} of{" "}
                          {anomalies.length} anomalies in priority order (most
                          urgent first). Open{" "}
                          <Link href="/anomalies">the full list</Link> to filter
                          and sort every anomaly.
                        </Text>
                      )}
                      {anomalies.length <= overview.length && (
                        <Text type="secondary">
                          Ordered by backend priority, most urgent first.
                        </Text>
                      )}
                    </>
                  )}
                </Space>
              </Card>
            </section>
          </>
        )}
      </div>
    </PrivateRoute>
  );
}

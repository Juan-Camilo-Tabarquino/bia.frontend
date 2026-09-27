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
import { InsightBanner } from "@/components/dashboard/InsightBanner";
import { KpiDeltaPill } from "@/components/dashboard/KpiDeltaPill";
import {
  anomalySeverities,
  anomalySeverityLabels,
  anomalyTypeColors,
  anomalyTypeLabels,
  anomalyTypes,
  severityColors,
} from "@/components/anomalies/anomalyLabels";
import { meterStatusLabel } from "@/components/formatters";
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

/**
 * Number of KPI cards the loading skeleton mirrors: the four summary cards
 * plus the four leading-anomaly signal cards the loaded row can show.
 */
const KPI_CARD_COUNT = 8;

/** Signed change fields the anomaly DTO carries, in the order the pills render. */
type DeltaSignalField =
  | "consumption_change_pct"
  | "voltage_change_pct"
  | "current_change_pct"
  | "power_factor_change_pct";

/**
 * The four deltas the dashboard can show with a pill, each one a DTO field.
 * These are read verbatim; no value is derived and no signal is invented.
 */
const ANOMALY_DELTA_SIGNALS: ReadonlyArray<{
  field: DeltaSignalField;
  label: string;
}> = [
  { field: "consumption_change_pct", label: "Cambio de consumo" },
  { field: "voltage_change_pct", label: "Cambio de voltaje" },
  { field: "current_change_pct", label: "Cambio de corriente" },
  { field: "power_factor_change_pct", label: "Cambio de factor de potencia" },
];

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
 *
 * The delta pills and the insight banner are Bia's visual signature, and they
 * only ever show what the DTO already carries: the leading anomaly's four
 * signed change percentages (each relative to that anomaly's own `baseline`)
 * and plain counts of the fetched rows. None of them is a period-over-period
 * delta, because the API exposes no previous run to compare against.
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

  // `GET /api/anomalies` returns rows already ordered by ascending `priority`
  // (most urgent first) and the preview is never re-sorted, so the head of the
  // array is the anomaly the delta pills describe.
  const leadingAnomaly = anomalies[0];
  // The summary DTO has no severity breakdown, so this is a plain count of the
  // fetched rows — the same source the severity tags below use.
  const highSeverityCount = severityCounts.get("HIGH") ?? 0;

  const isLoading = summaryLoading || anomaliesLoading;
  const error = summaryError ?? anomaliesError;

  return (
    <PrivateRoute>
      <div style={{ padding: "1rem" }}>
        <Title level={1}>Panel de control</Title>
        <p className="sr-only">
          Indicadores clave de la última ejecución determinística y una
          previsualización de las anomalías detectadas, que llegan desde la API
          ordenadas por prioridad (la más urgente primero). Los conteos por tipo
          y por severidad se calculan en el navegador a partir de la lista de
          anomalías obtenida. Las píldoras de cambio muestran los porcentajes
          con signo de la anomalía más urgente respecto de su propia línea base,
          y el banner de análisis usa el total del resumen más el conteo de
          filas de severidad HIGH; no se muestra ninguna otra métrica.
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
            <section aria-label="Indicadores clave">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Estado"
                      value={
                        summary?.health
                          ? meterStatusLabel(summary.health)
                          : "—"
                      }
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic title="Medidores" value={summary?.meters ?? "—"} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Anomalías"
                      value={summary?.anomalies ?? anomalies.length}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Última ejecución"
                      value={summary?.lastRun ?? "—"}
                    />
                  </Card>
                </Col>
              </Row>

              {leadingAnomaly && (
                <section
                  aria-label="Cambios de la anomalía más urgente"
                  style={{ marginTop: "1rem" }}
                >
                  <Text type="secondary">
                    Cambios de la anomalía más urgente (
                    {leadingAnomaly.meter_id}).
                  </Text>
                  <Row gutter={[16, 16]} style={{ marginTop: "0.5rem" }}>
                    {ANOMALY_DELTA_SIGNALS.map(({ field, label }) => (
                      <Col key={field} xs={24} sm={12} lg={6}>
                        <Card>
                          <Text type="secondary">{label}</Text>
                          <div
                            style={{ marginTop: "0.5rem", fontSize: "1.5rem" }}
                          >
                            <KpiDeltaPill changePct={leadingAnomaly[field]} />
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </section>
              )}

              <div style={{ marginTop: "1rem" }}>
                <InsightBanner
                  total={summary?.anomalies ?? anomalies.length}
                  highSeverity={highSeverityCount}
                />
              </div>
            </section>

            <section
              aria-label="Resumen de anomalías"
              style={{ marginTop: "1.5rem" }}
            >
              <Card
                title="Resumen de anomalías"
                extra={
                  <Space>
                    <Link href="/meters">Ver medidores</Link>
                    <Button type="primary" href="/anomalies">
                      Ver todas las anomalías
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
                    <Text strong>Por tipo</Text>
                    <section
                      aria-label="Conteo de anomalías por tipo"
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
                    <Text strong>Por severidad</Text>
                    <section
                      aria-label="Conteo de anomalías por severidad"
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
                              {anomalySeverityLabels[severity]}: {count}
                            </Tag>
                          );
                        })}
                      </Space>
                    </section>
                  </div>

                  <Text type="secondary">
                    Los conteos se calculan en el navegador a partir de la lista
                    de anomalías obtenida; el endpoint de resumen solo informa
                    totales.
                  </Text>

                  {anomalies.length === 0 ? (
                    <Empty description="No se reportaron anomalías." />
                  ) : (
                    <>
                      <AnomalyTable anomalies={overview} />
                      {anomalies.length > overview.length && (
                        <Text type="secondary">
                          Mostrando las primeras {overview.length} de{" "}
                          {anomalies.length} anomalías en orden de prioridad (la
                          más urgente primero). Abre{" "}
                          <Link href="/anomalies">la lista completa</Link> para
                          filtrar y ordenar todas las anomalías.
                        </Text>
                      )}
                      {anomalies.length <= overview.length && (
                        <Text type="secondary">
                          Ordenadas por prioridad del backend, la más urgente
                          primero.
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

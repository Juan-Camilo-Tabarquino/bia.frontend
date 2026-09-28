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
import {
  formatConfidence,
  formatDateTime,
  formatMetric,
  meterStatusLabel,
} from "@/components/formatters";
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
 * Number of KPI cards the loaded overview renders.
 *
 * §5 of the technical test names the full set; `Estado` is the pre-existing
 * backend-health card and is kept alongside them, so the count below is the
 * seven cards the JSX actually renders. Both constants exist so the loading
 * skeleton cannot drift from the loaded shape in either direction.
 */
const KPI_COUNT = 7;

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

/**
 * Number of placeholder cards the loading skeleton mirrors: the KPI row plus
 * the four leading-anomaly signal cards the loaded page can show.
 */
const KPI_CARD_COUNT = KPI_COUNT + ANOMALY_DELTA_SIGNALS.length;

/**
 * State of the last analysis run.
 *
 * `GET /api/dashboard/summary` carries one timestamp and no status field, so the
 * only state derivable from it is whether a run actually reported something: a
 * parseable RFC3339 value means a completed run, and anything else — a missing
 * value, or the literal `"latest"` an older backend sent — is "no data".
 * Inventing an "en curso" state would require progress the endpoint does not
 * expose.
 */
function lastRunState(lastRun: string | undefined): {
  label: string;
  color: string;
} {
  if (lastRun !== undefined && !Number.isNaN(Date.parse(lastRun))) {
    return { label: "Completado", color: "green" };
  }
  return { label: "Sin datos", color: "default" };
}

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
  // `total_consumption`, `lastRun`): it exposes no `by_type` or `by_severity`
  // breakdown. Every per-category count below is therefore derived in the
  // browser from the fetched `GET /api/anomalies` array — including the two §5
  // KPIs, `Alta prioridad` (the HIGH-severity count) and `Confianza IA` (the
  // mean of `confidence`), which the backend is deliberately not asked for.
  const typeCounts = useMemo(() => countTypes(anomalies), [anomalies]);
  const severityCounts = useMemo(() => countSeverities(anomalies), [anomalies]);
  const overview = anomalies.slice(0, OVERVIEW_LIMIT);

  // The mean of the fetched `confidence` values, or `null` when there is
  // nothing to average: an empty list has no confidence, and `0%` would claim
  // the model scored every row at zero.
  const confidenceAverage = useMemo(
    () =>
      anomalies.length === 0
        ? null
        : anomalies.reduce((total, anomaly) => total + anomaly.confidence, 0) /
          anomalies.length,
    [anomalies],
  );

  // `GET /api/anomalies` returns rows already ordered by ascending `priority`
  // (most urgent first) and the preview is never re-sorted, so the head of the
  // array is the anomaly the delta pills describe.
  const leadingAnomaly = anomalies[0];
  // The summary DTO has no severity breakdown, so this is a plain count of the
  // fetched rows — the same source the severity tags below use.
  const highSeverityCount = severityCounts.get("HIGH") ?? 0;

  const isLoading = summaryLoading || anomaliesLoading;
  const error = summaryError ?? anomaliesError;

  // `total_consumption` is new on the summary. It is read through the same
  // finite guard every other number here uses, so a response that predates the
  // field renders the `—` placeholder instead of throwing inside `formatMetric`.
  const totalConsumption =
    summary && Number.isFinite(summary.total_consumption)
      ? summary.total_consumption
      : null;
  const lastRun = summary?.lastRun;
  const lastRunStatus = lastRunState(lastRun);
  const hasLastRun = lastRun !== undefined && lastRun.length > 0;

  return (
    // The shell container owns the horizontal gutter on every route; this
    // page keeps only the vertical padding so its title aligns at x=144.
    <div style={{ paddingBlock: "1rem" }}>
      <Title level={1}>Panel de control</Title>
      <p className="sr-only">
        Indicadores clave de la última ejecución determinística y una
        previsualización de las anomalías detectadas, que llegan desde la API
        ordenadas por prioridad (la más urgente primero). El consumo total y el
        estado del último análisis vienen del endpoint de resumen; los conteos
        por tipo y por severidad, el conteo de alta prioridad y la confianza
        promedio se calculan en el navegador a partir de la lista de anomalías
        obtenida. Las píldoras de cambio muestran los porcentajes con signo de la
        anomalía más urgente respecto de su propia línea base, y el banner de
        análisis usa el total del resumen más el conteo de filas de severidad
        HIGH; no se muestra ninguna otra métrica.
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
                  {/* The number is formatted by the shared helper and the unit is
                      part of the value string, not a `suffix`: `Statistic`
                      regroups a numeric value with its own en-US separators
                      (`12,345`), which a Spanish reader reads as twelve point
                      three four five. The rest of the app never groups digits,
                      so neither does this card. */}
                  <Statistic
                    title="Consumo total"
                    value={
                      totalConsumption === null
                        ? "—"
                        : `${formatMetric(totalConsumption, 1)} kWh`
                    }
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Anomalías IA"
                    value={summary?.anomalies ?? anomalies.length}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  {/* Derived in the browser from the fetched anomalies: the
                      summary exposes no severity breakdown. */}
                  <Statistic title="Alta prioridad" value={highSeverityCount} />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Confianza IA"
                    value={
                      confidenceAverage === null
                        ? "—"
                        : formatConfidence(confidenceAverage)
                    }
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Último análisis"
                    value={hasLastRun ? formatDateTime(lastRun) : "—"}
                  />
                  <div style={{ marginTop: "0.5rem" }}>
                    <Tag color={lastRunStatus.color}>
                      {lastRunStatus.label}
                    </Tag>
                  </div>
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
  );
}

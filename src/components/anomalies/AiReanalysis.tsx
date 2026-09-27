"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Space, Typography } from "antd";
import {
  ANALYSIS_POLL_INTERVAL_MS,
  isAnalysisPending,
  useGetAiAnalysisQuery,
  usePostAnalyzeMutation,
} from "@/features/dashboards/dashboardAPI";
import { AnomalyNarrative } from "./AnomalyNarrative";
import styles from "./AiReanalysis.module.scss";

const { Text } = Typography;

/** Latency disclosure shown both before and during the request. */
const LATENCY_HELPER =
  "Vuelve a ejecutar el pipeline determinístico de anomalías y la narrativa del LLM para cada anomalía, y luego carga el resultado. Puede tardar alrededor de un minuto.";
const RUNNING_MESSAGE =
  "El análisis está en curso. Puede tardar alrededor de un minuto.";
const FALLBACK_ERROR =
  "No se pudo completar el análisis de la plataforma. Inténtalo de nuevo.";
const FAILED_MESSAGE =
  "El backend informó que el análisis falló. Vuelve a intentarlo.";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

/** Names the reported status, so the wait is observable instead of a bare spinner. */
function getPendingMessage(status: string | undefined): string {
  return `El análisis sigue en curso (estado: ${status}). Se actualizará automáticamente.`;
}

/**
 * An unrecognised status is reported as such. The wording claims nothing about
 * completion, because this interface cannot confirm it.
 */
function getUnknownStatusMessage(status: string | undefined): string {
  return `El análisis devolvió el estado "${status}", que esta interfaz no reconoce. No se puede confirmar que haya terminado.`;
}

/**
 * On-demand trigger for the backend's AI analysis.
 *
 * `POST /api/ai/analyze` reads no body: it starts a run and `GET
 * /api/ai/analysis/{id}` reports how that run is going. The response carries a
 * `status`, so this block polls the read endpoint ONLY while the API reports one
 * of the two non-terminal statuses (`isAnalysisPending`) and stops on anything
 * else — every terminal status, and every status the allow-list does not name.
 * That is why an unrecognised status stops the polling instead of requesting
 * forever, and why it is never rendered as a finished analysis.
 *
 * Because the run can legitimately stay pending for about a minute, the block
 * states the wait openly and names the reported status instead of hiding it
 * behind a bare spinner.
 *
 * The action is additive: the deterministic anomaly list already on the page
 * remains the source of truth and is never replaced, reordered or mutated.
 *
 * The result's `anomalies` array inherits the same deterministic priority
 * ordering as `GET /api/anomalies`: the backend maps both the list endpoint and
 * this stored snapshot through one shared helper (`anomalyDTOs` over
 * `sortedEvidence`), so element `0` is the most urgent anomaly.
 */
export function AiReanalysis() {
  const [postAnalyze, { isLoading, data, error }] = usePostAnalyzeMutation();
  const analysisId = data?.analysisId ?? "";

  // `pollingInterval` belongs to the same hook call that returns the status, so
  // the interval can only follow the status reported by the PREVIOUS render. The
  // render-phase adjustment below is React's supported "derive from what the
  // previous render saw" pattern, which `AnomalyFilters` already uses for its
  // externally owned term; it lives in state rather than in a ref because a ref
  // cannot be written during a render.
  const [polling, setPolling] = useState(false);

  const { data: result, error: resultError } = useGetAiAnalysisQuery(
    analysisId,
    {
      skip: analysisId.length === 0,
      pollingInterval: polling ? ANALYSIS_POLL_INTERVAL_MS : 0,
    },
  );

  const status = result?.status;
  const pending = isAnalysisPending(status);
  const topAnomaly = result?.anomalies[0];
  const failed = Boolean(error) || Boolean(resultError);

  // A failed READ deliberately does not stop the polling once a non-terminal
  // status has been observed: the run continues on the backend regardless of one
  // failed poll, and a later successful poll clears the error and lets the result
  // replace the alert. Stopping instead would make the user re-run the whole
  // analysis (a minute and one LLM call per evidence item) to learn an outcome
  // the next poll could have delivered. If the VERY FIRST read fails there is no
  // status yet, so nothing is armed: the alert is shown and the button stays
  // available for a fresh run.
  if (polling !== pending) {
    setPolling(pending);
  }

  return (
    <section aria-label="Análisis con IA" className={styles.section}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Button
            type="primary"
            onClick={() => {
              void postAnalyze();
            }}
            loading={isLoading}
            disabled={isLoading || pending}
            aria-describedby="ai-reanalysis-latency"
          >
            Reintentar el análisis de la plataforma
          </Button>
          <Text
            id="ai-reanalysis-latency"
            type="secondary"
            className={styles.helper}
          >
            {LATENCY_HELPER}
          </Text>
        </div>

        {isLoading && (
          <Text role="status" className={styles.status}>
            {RUNNING_MESSAGE}
          </Text>
        )}

        {!isLoading && failed && (
          <Alert
            type="error"
            showIcon
            title="El análisis falló"
            description={getErrorMessage(
              error ?? resultError,
              FALLBACK_ERROR,
            )}
          />
        )}

        {!isLoading && !failed && pending && (
          <Text role="status" className={styles.status}>
            {getPendingMessage(status)}
          </Text>
        )}

        {!isLoading && !failed && !pending && status === "failed" && (
          <Alert
            type="error"
            showIcon
            title="El análisis falló"
            description={FAILED_MESSAGE}
          />
        )}

        {!isLoading &&
          !failed &&
          !pending &&
          result &&
          status !== "completed" &&
          status !== "failed" && (
            <Alert
              type="warning"
              showIcon
              title="Estado del análisis no reconocido"
              description={getUnknownStatusMessage(status)}
            />
          )}

        {!isLoading && !failed && result && status === "completed" && (
          <div className={styles.result}>
            <Text role="status" className={styles.status}>
              {result.anomalies.length === 0
                ? "Análisis completado: no se devolvió ninguna anomalía."
                : `Análisis completado: se devolvieron ${result.anomalies.length} ${
                    result.anomalies.length === 1 ? "anomalía" : "anomalías"
                  }.`}
            </Text>

            {topAnomaly && (
              <div className={styles.topAnomaly}>
                <Text strong>Anomalía más urgente</Text>
                <div className={styles.linkRow}>
                  <Link
                    href={`/anomalies/${encodeURIComponent(topAnomaly.id)}`}
                  >
                    {topAnomaly.id}
                  </Link>
                </div>
                <AnomalyNarrative analysis={topAnomaly.llm_analysis} />
              </div>
            )}
          </div>
        )}
      </Space>
    </section>
  );
}

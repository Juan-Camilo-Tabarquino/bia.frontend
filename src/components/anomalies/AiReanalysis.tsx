"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Space, Steps, Typography } from "antd";
import {
  ANALYSIS_POLL_INTERVAL_MS,
  ANALYSIS_STAGES,
  analysisStageIndex,
  isAnalysisPending,
  useGetAiAnalysisQuery,
  usePostAnalyzeMutation,
} from "@/features/dashboards/dashboardAPI";
import type { AnalysisPlatformSummary } from "@/types/backend";
import { AnomalyNarrative } from "./AnomalyNarrative";
import styles from "./AiReanalysis.module.scss";

const { Text } = Typography;

/** Latency disclosure shown both before and during the request. */
const LATENCY_HELPER =
  "Vuelve a ejecutar el pipeline determinístico de anomalías y la narrativa del LLM para este medidor, y luego carga el resultado. Puede tardar alrededor de un minuto.";
const RUNNING_MESSAGE =
  "El análisis está en curso. Puede tardar alrededor de un minuto.";
const FALLBACK_ERROR =
  "No se pudo completar el análisis del medidor. Inténtalo de nuevo.";
const FAILED_MESSAGE =
  "El backend informó que el análisis falló. Vuelve a intentarlo.";

interface AiReanalysisProps {
  /** Meter the on-demand analysis run is scoped to. */
  meterId: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    // RTK Query surfaces a JSON error body under `data`, so a `400` from the
    // POST (unknown meter) shows the backend's `{"error":"…"}` string instead of
    // the generic fallback. `message` stays the first choice because that is the
    // shape the existing mutation errors use.
    const { message, data } = error as { message?: unknown; data?: unknown };
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
    if (data && typeof data === "object" && "error" in data) {
      const { error: bodyError } = data as { error?: unknown };
      if (typeof bodyError === "string" && bodyError.length > 0) {
        return bodyError;
      }
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
 * Platform-wide closing line for a completed run. The counters are the ones the
 * backend reports under `platform`, never a client-side recount.
 */
function getPlatformClosingLine(
  platform: AnalysisPlatformSummary | undefined,
): string {
  if (!platform) {
    return "El backend no informó el resumen de la plataforma.";
  }
  const { total_anomalies: total, high_priority: high } = platform;
  return `${total} ${
    total === 1 ? "anomalía detectada" : "anomalías detectadas"
  } · ${high} ${high === 1 ? "requiere" : "requieren"} atención prioritaria`;
}

/**
 * Seconds elapsed since the run started, ticking once per second while the run
 * is in flight. Returns `undefined` when there is no start timestamp (or it is
 * unparseable), so nothing is drawn for an idle block.
 *
 * One LLM call exposes no partial progress, so this seconds counter is the
 * honest signal during the wait; a percentage would be invented.
 */
function useElapsedSeconds(
  startedAt: string | undefined,
  inFlight: boolean,
): number | undefined {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!inFlight) {
      return;
    }
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1_000);
    return () => {
      clearInterval(timer);
    };
  }, [inFlight]);

  if (!startedAt) {
    return undefined;
  }
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) {
    return undefined;
  }
  const seconds = Math.floor((now - start) / 1_000);
  return seconds > 0 ? seconds : 0;
}

/**
 * On-demand, per-meter trigger for the backend's AI analysis.
 *
 * `POST /api/ai/analyze` takes `{"meter_id":"M-109"}`, starts (or joins) a run
 * and `GET /api/ai/analysis/{id}` reports how that run is going. The response
 * carries a `status`, so this block polls the read endpoint ONLY while the API
 * reports one of the two non-terminal statuses (`isAnalysisPending`) and stops
 * on anything else — every terminal status, and every status the allow-list does
 * not name. That is why an unrecognised status stops the polling instead of
 * requesting forever, and why it is never rendered as a finished analysis.
 *
 * The response also carries the real pipeline `stage`, so the seven-step
 * indicator below reflects the backend's stage — never a simulated advance — and
 * the wait is shown as the active stage plus elapsed seconds (one LLM call has
 * no partial progress, so no fake percentage is drawn).
 *
 * Because the run can legitimately stay pending for about a minute, the block
 * states the wait openly and names the reported status instead of hiding it
 * behind a bare spinner.
 *
 * The action is additive: the deterministic anomaly list elsewhere in the app
 * remains the source of truth and is never replaced, reordered or mutated.
 *
 * The result's `anomalies` array holds the anomalies of THIS meter, in the same
 * deterministic priority ordering as `GET /api/anomalies` (the backend maps both
 * through one shared helper), so element `0` is the most urgent one.
 */
export function AiReanalysis({ meterId }: AiReanalysisProps) {
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
  const failedRun = status === "failed";
  const currentIndex = analysisStageIndex(result?.stage, result?.progress);
  const elapsed = useElapsedSeconds(result?.started_at, pending);

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

  // Steps before the active one are `finish`, the active one is `process` (or
  // `error` on failure), and every later one is `wait`. Before the pipeline
  // starts `currentIndex` is `-1`, so the whole list stays pending.
  const stepItems = ANALYSIS_STAGES.map((step, index) => {
    let stepStatus: "wait" | "process" | "finish" | "error" = "wait";
    if (currentIndex >= 0 && index < currentIndex) {
      stepStatus = "finish";
    } else if (index === currentIndex) {
      stepStatus = failedRun ? "error" : "process";
    }
    const showElapsed =
      index === currentIndex && elapsed !== undefined && !failedRun;
    return {
      key: step.stage,
      status: stepStatus,
      title: showElapsed ? `${step.label} — ${elapsed} s` : step.label,
    };
  });

  return (
    <section aria-label="Análisis con IA" className={styles.section}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Button
            type="primary"
            onClick={() => {
              void postAnalyze({ meterId });
            }}
            loading={isLoading}
            disabled={isLoading || pending}
            aria-describedby="ai-reanalysis-latency"
          >
            Correr análisis con IA
          </Button>
          <Text
            id="ai-reanalysis-latency"
            type="secondary"
            className={styles.helper}
          >
            {LATENCY_HELPER}
          </Text>
        </div>

        <div>
          <Text strong className={styles.status}>
            Estado del proceso
          </Text>
          <Steps orientation="vertical" size="small" items={stepItems} />
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
            description={result?.error ?? FAILED_MESSAGE}
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

            <Text className={styles.status}>
              {getPlatformClosingLine(result.platform)}
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
                <Text strong>Acción recomendada</Text>
                <Text className={styles.status}>
                  {topAnomaly.recommended_action}
                </Text>
                <AnomalyNarrative analysis={topAnomaly.llm_analysis} />
              </div>
            )}
          </div>
        )}
      </Space>
    </section>
  );
}

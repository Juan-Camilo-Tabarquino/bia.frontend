import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { prepareAuthHeaders } from "../auth/authHeaders";
import type {
  AnalysisResult,
  AnalysisStage,
  AnalyzeResponse,
} from "../../types/backend";

// Resolve API base URL from utility (NEXT_PUBLIC_API_URL)
const dashboardBaseUrl = getApiBaseUrl();

/**
 * RTK Query slice for the AI analysis flow. The AI only narrates evidence
 * produced by the backend's deterministic pipeline; it is never the detector.
 *
 * Endpoints:
 * - postAnalyze     POST /ai/analyze
 * - getAiAnalysis   GET  /ai/analysis/{id}
 */
export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: fetchBaseQuery({
    baseUrl: dashboardBaseUrl,
    prepareHeaders: prepareAuthHeaders,
  }),
  endpoints: (builder) => ({
    postAnalyze: builder.mutation<AnalyzeResponse, { meterId: string }>({
      query: ({ meterId }) => ({
        url: "/ai/analyze",
        method: "POST",
        // The backend keys the run by `meter_id`; a second POST while one run
        // for that meter is in flight returns the existing `analysisId`.
        body: { meter_id: meterId },
      }),
    }),
    getAiAnalysis: builder.query<AnalysisResult, string>({
      query: (analysisId) => `/ai/analysis/${analysisId}`,
    }),
  }),
});

export const { usePostAnalyzeMutation, useGetAiAnalysisQuery } = dashboardApi;

/** Interval between polls while the analysis has not reached a terminal state. */
export const ANALYSIS_POLL_INTERVAL_MS = 3_000;

/**
 * `"queued"` and `"running"` — an allow-list of exactly the two statuses the
 * analysis endpoint reports before the run reaches a terminal state.
 *
 * It is deliberately an allow-list and not "everything except the terminal
 * values": the safety property is that an UNKNOWN status — a future
 * `"processing"`, a malformed payload — stops the polling instead of making the
 * client request forever. An unrecognised status is therefore never polled and
 * never presented as a finished analysis.
 */
export function isAnalysisPending(status: string | undefined): boolean {
  return status === "queued" || status === "running";
}

/** The seven real pipeline stages, without the lifecycle-only stage values. */
export type AnalysisStageName = Exclude<
  AnalysisStage,
  "queued" | "completed" | "failed"
>;

/** One pipeline stage as the UI draws it. */
export interface AnalysisStageStep {
  stage: AnalysisStageName;
  label: string;
}

/**
 * The seven real pipeline stages, in backend order, with the Spanish labels the
 * UI draws. Single source of truth shared by `AiReanalysis` and its tests, so a
 * stage can never be labelled differently in two places.
 */
export const ANALYSIS_STAGES: readonly AnalysisStageStep[] = [
  { stage: "lecturas", label: "Lecturas" },
  { stage: "baseline", label: "Baseline" },
  { stage: "deteccion", label: "Detección" },
  { stage: "correlacion", label: "Correlación" },
  { stage: "eventos", label: "Eventos" },
  { stage: "explicacion", label: "Explicación con IA" },
  { stage: "recomendacion", label: "Recomendación" },
];

/**
 * Index of the active step in `ANALYSIS_STAGES` for a reported `stage`, or `-1`
 * before the pipeline starts (no stage, or `"queued"`), which leaves every step
 * pending. `"completed"` returns one past the last step, so every step renders
 * as `finish`.
 *
 * The contract reports `"failed"` as the stage, so a failed run falls back to
 * `progress.done` to locate the step that was active when the run stopped.
 */
export function analysisStageIndex(
  stage: AnalysisStage | string | undefined,
  progress?: { done: number },
): number {
  if (!stage || stage === "queued") {
    return -1;
  }
  if (stage === "completed") {
    return ANALYSIS_STAGES.length;
  }
  if (stage === "failed") {
    const done = progress?.done ?? 0;
    return Math.min(Math.max(done, 0), ANALYSIS_STAGES.length - 1);
  }
  return ANALYSIS_STAGES.findIndex((step) => step.stage === stage);
}

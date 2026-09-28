import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { prepareAuthHeaders } from "../auth/authHeaders";
import type { AnalysisResult, AnalyzeResponse } from "../../types/backend";

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
    postAnalyze: builder.mutation<AnalyzeResponse, void>({
      query: () => ({
        url: "/ai/analyze",
        method: "POST",
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

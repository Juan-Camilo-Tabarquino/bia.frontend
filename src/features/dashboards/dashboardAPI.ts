import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
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
  baseQuery: fetchBaseQuery({ baseUrl: dashboardBaseUrl }),
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

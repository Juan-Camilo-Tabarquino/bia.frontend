import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import type {
  Anomaly,
  DashboardSummary,
  MeterDetail,
  MeterId,
} from "../../types/backend";

// Resolve API base URL from utility (NEXT_PUBLIC_API_URL)
const apiBaseUrl = getApiBaseUrl();

/**
 * RTK Query slice for the resource endpoints.
 *
 * Endpoints:
 * - getMeters            GET /meters                -> MeterId[] (bare strings)
 * - getMeterDetail       GET /meters/{meterId}      -> MeterDetail
 * - getAnomalies         GET /anomalies             -> Anomaly[] (unsorted)
 * - getAnomalyById       GET /anomalies/{id}        -> Anomaly
 * - getDashboardSummary  GET /dashboard/summary     -> DashboardSummary
 *
 * There is no `/events` resource on the backend.
 *
 * Readings live in `dataApi` and the AI analysis flow lives in `dashboardApi`,
 * so every exported hook name stays unique across the three slices.
 */
export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: apiBaseUrl,
  }),
  endpoints: (builder) => ({
    getMeters: builder.query<MeterId[], void>({
      query: () => "/meters",
    }),
    getMeterDetail: builder.query<MeterDetail, string>({
      query: (meterId) => `/meters/${meterId}`,
    }),
    getAnomalies: builder.query<Anomaly[], void>({
      query: () => "/anomalies",
    }),
    getAnomalyById: builder.query<Anomaly, string>({
      query: (id) => `/anomalies/${id}`,
    }),
    getDashboardSummary: builder.query<DashboardSummary, void>({
      query: () => "/dashboard/summary",
    }),
  }),
});

export const {
  useGetMetersQuery,
  useGetMeterDetailQuery,
  useGetAnomaliesQuery,
  useGetAnomalyByIdQuery,
  useGetDashboardSummaryQuery,
} = apiSlice;

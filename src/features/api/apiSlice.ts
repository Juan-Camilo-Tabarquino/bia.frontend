import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiBaseUrl } from "../../utils/apiBaseUrl";
import { prepareAuthHeaders } from "../auth/authHeaders";
import type {
  Anomaly,
  DashboardSummary,
  MeterDetail,
  MeterSummary,
} from "../../types/backend";

// Resolve API base URL from utility (NEXT_PUBLIC_API_URL)
const apiBaseUrl = getApiBaseUrl();

/** Body of `POST /auth/login`. */
export interface LoginRequest {
  username: string;
  password: string;
}

/** The user object the login endpoint echoes back. */
export interface LoginResponseUser {
  username: string;
  name: string;
  authorized: boolean;
}

/** Success body of `POST /auth/login`. */
export interface LoginResponse {
  token: string;
  expires_at: string;
  user: LoginResponseUser;
}

/**
 * RTK Query slice for the resource endpoints.
 *
 * Endpoints:
 * - login                POST /auth/login              -> LoginResponse (no auth required)
 * - getMeters            GET /meters                -> MeterSummary[] (id + consumption + status + last reading)
 * - getMeterDetail       GET /meters/{meterId}      -> MeterDetail
 * - getAnomalies         GET /anomalies             -> Anomaly[] (API order: priority ascending)
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
    prepareHeaders: prepareAuthHeaders,
  }),
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
    getMeters: builder.query<MeterSummary[], void>({
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
  useLoginMutation,
  useGetMetersQuery,
  useGetMeterDetailQuery,
  useGetAnomaliesQuery,
  useGetAnomalyByIdQuery,
  useGetDashboardSummaryQuery,
} = apiSlice;

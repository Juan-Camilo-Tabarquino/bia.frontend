import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';\n

/**
 * RTK Query API slice for the backend endpoints.
 *
 * Endpoints:
 * - getMeters
 * - getMeterDetail
 * - getAnalysis
 * - getMeterReadings
 * - getMeterAnomalies
 */
import { Meter, MeterDetail, Analysis, Reading, Anomaly } from "../../types/backend";\n
export const apiSlice = createApi({\n
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  }),
  endpoints: (builder) => ({
    getMeters: builder.query<Meter[], void>({
      query: () => '/meters',
    }),
    getMeterDetail: builder.query<MeterDetail, { meterId: string; start?: string; end?: string }>({
      query: ({ meterId, start, end }) => ({
        url: `/meter/${meterId}/detail`,
        params: { start, end },
      }),
    }),
    getAnalysis: builder.query<Analysis, { start?: string; end?: string }>({
      query: ({ start, end }) => ({
        url: '/analysis',
        params: { start, end },
      }),
    }),
    getMeterReadings: builder.query<Reading[], { meterId: string; start?: string; end?: string }>({
      query: ({ meterId, start, end }) => ({
        url: `/meter/${meterId}/readings`,
        params: { start, end },
      }),
    }),
    getMeterAnomalies: builder.query<Anomaly[], { meterId: string; start?: string; end?: string }>({
      query: ({ meterId, start, end }) => ({
        url: `/meter/${meterId}/anomalies`,
        params: { start, end },
      }),
    }),
  }),
});

export const {
  useGetMetersQuery,
  useGetMeterDetailQuery,
  useGetAnalysisQuery,
  useGetMeterReadingsQuery,
  useGetMeterAnomaliesQuery,
} = apiSlice;

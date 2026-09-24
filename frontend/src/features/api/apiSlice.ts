import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

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
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  }),
  endpoints: (builder) => ({
    getMeters: builder.query<any, void>({
      query: () => '/meters',
    }),
    getMeterDetail: builder.query<any, { meterId: string; start?: string; end?: string }>({
      query: ({ meterId, start, end }) => ({
        url: `/meter/${meterId}/detail`,
        params: { start, end },
      }),
    }),
    getAnalysis: builder.query<any, { start?: string; end?: string }>({
      query: ({ start, end }) => ({
        url: '/analysis',
        params: { start, end },
      }),
    }),
    getMeterReadings: builder.query<any, { meterId: string; start?: string; end?: string }>({
      query: ({ meterId, start, end }) => ({
        url: `/meter/${meterId}/readings`,
        params: { start, end },
      }),
    }),
    getMeterAnomalies: builder.query<any, { meterId: string; start?: string; end?: string }>({
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

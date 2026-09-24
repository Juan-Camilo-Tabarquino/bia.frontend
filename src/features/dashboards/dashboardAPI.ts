import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getAnalysis } from '../../api/backend';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api' }),
  endpoints: builder => ({
    getAnalysis: builder.query({
      query: ({ start, end }) => ({
        url: '/analysis',
        params: { start, end },
      }),
    }),
  }),
});
export const { useGetAnalysisQuery } = dashboardApi;

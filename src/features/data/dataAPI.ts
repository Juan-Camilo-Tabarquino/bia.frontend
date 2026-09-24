import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Reading } from "../../types/backend";

export const dataApi = createApi({
  reducerPath: 'dataApi',
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api' }),
  endpoints: builder => ({
    getMeterReadings: builder.query<Reading[], { meterId: string; start?: string; end?: string }>({
      query: ({ meterId, start, end }) => ({
        url: `/meter/${meterId}/readings`,
        params: { start, end },
      }),
    }),
  }),
});

export const { useGetMeterReadingsQuery } = dataApi;

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { MeterId, Reading } from "../../types/backend";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

// Resolve API base URL from utility (NEXT_PUBLIC_API_URL)
const dataBaseUrl = getApiBaseUrl();

/** Params for the readings endpoint; the backend expects `from`/`to`. */
export interface MeterReadingsParams {
  meterId: MeterId;
  /** RFC3339 lower bound. */
  from?: string;
  /** RFC3339 upper bound. */
  to?: string;
}

/**
 * RTK Query slice for meter readings.
 *
 * `GET /meters/{meterId}/readings` answers with a bare array of readings, or
 * with `200 null` when the meter is unknown or the window holds no readings.
 * That `null` is part of the contract, so the result type is `Reading[] | null`
 * and every consumer must narrow it before mapping.
 */
export const dataApi = createApi({
  reducerPath: "dataApi",
  baseQuery: fetchBaseQuery({ baseUrl: dataBaseUrl }),
  endpoints: (builder) => ({
    getMeterReadings: builder.query<Reading[] | null, MeterReadingsParams>({
      query: ({ meterId, from, to }) => ({
        url: `/meters/${meterId}/readings`,
        params: { from, to },
      }),
    }),
  }),
});

export const { useGetMeterReadingsQuery } = dataApi;

import axios from 'axios';

// Base axios instance pointing to the backend API. The URL can be overridden
// by the NEXT_PUBLIC_API_URL environment variable, which makes it easy to
// switch between local development, staging and production.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
});

/**
 * Health‑check endpoint.
 */
export const getHealth = () => api.get('/health');

/**
 * Get the list of meters.
 * @returns Array<{ id: string; name?: string }>
 */
export const getMeters = () => api.get('/meters');

/**
 * Get measurements for a meter.
 * @param meterId
 * @param start ISO string start date
 * @param end   ISO string end date
 */
export const getMeterReadings = (meterId: string, start?: string, end?: string) =>
  api.get(`/meter/${meterId}/readings`, {
    params: { start, end },
  });

/**
 * Get anomalies detected for a meter over a date range.
 */
export const getMeterAnomalies = (meterId: string, start?: string, end?: string) =>
  api.get(`/meter/${meterId}/anomalies`, {
    params: { start, end },
  });

/**
 * Get analysis for a given date range (baseline, anomalies, correlation, etc.)
 */
export const getAnalysis = (start?: string, end?: string) =>
  api.get('/analysis', {
    params: { start, end },
  });

/**
 * Get detailed information for a specific meter, optional date range.
 */
export const getMeterDetail = (meterId: string, start?: string, end?: string) =>
  api.get(`/meter/${meterId}/detail`, {
    params: { start, end },
  });

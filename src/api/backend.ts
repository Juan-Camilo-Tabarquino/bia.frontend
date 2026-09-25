import axios, { type AxiosResponse } from "axios";
import { getApiBaseUrl } from "../utils/apiBaseUrl";
import type { HealthResponse } from "../types/backend";

// Base axios instance pointing to the backend API. `getApiBaseUrl()` is the
// single base-URL accessor (it owns the NEXT_PUBLIC_API_URL lookup).
const api = axios.create({
  baseURL: getApiBaseUrl(),
});

/** `GET /health` */
export const getHealth = (): Promise<AxiosResponse<HealthResponse>> =>
  api.get("/health");

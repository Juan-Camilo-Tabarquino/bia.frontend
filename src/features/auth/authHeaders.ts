import { getSession } from "./session";

/**
 * Shared `prepareHeaders` for every RTK Query slice.
 *
 * It attaches `Authorization: Bearer <token>` whenever a valid session exists,
 * so the three slices (`apiSlice`, `dataApi`, `dashboardAPI`) share one copy of
 * the logic instead of triplicating it.
 *
 * This header is a UX-flow detail, not a security boundary: the backend does
 * not validate the token on any route other than `POST /api/auth/login`, so
 * there is no response interceptor here. A stale or forged token changes
 * nothing on the server, and there is no 401 to react to.
 */
export function prepareAuthHeaders(headers: Headers): Headers {
  const session = getSession();
  if (session !== null) {
    headers.set("authorization", `Bearer ${session.token}`);
  }
  return headers;
}

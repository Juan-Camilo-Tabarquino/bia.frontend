"use client";

import type { ReactNode } from "react";
import { Alert, Button } from "antd";

/** Spanish headline used when the caller does not name the failed resource. */
const DEFAULT_TITLE = "No se pudieron cargar los datos";

interface RequestErrorProps {
  /** Spanish headline naming what failed. */
  title?: string;
  /** Optional Spanish detail; the raw backend message when one exists. */
  description?: ReactNode;
  /** Retries the failed request, wired to the RTK Query `refetch`. */
  onRetry: () => void;
  /** Keeps the retry action disabled while a retry is in flight. */
  retrying?: boolean;
}

/**
 * The single error vocabulary for a failed page-level request.
 *
 * antd's `Alert` already renders `role="alert"` on its root, so the failure is
 * announced; every consumer gets the same way out, a "Reintentar" action the
 * page wires to its query's `refetch`. This replaces the six ad-hoc error
 * presentations the app shipped before.
 */
export function RequestError({
  title = DEFAULT_TITLE,
  description,
  onRetry,
  retrying = false,
}: RequestErrorProps) {
  return (
    <Alert
      type="error"
      showIcon
      title={title}
      description={description}
      action={
        <Button
          size="small"
          onClick={onRetry}
          loading={retrying}
          disabled={retrying}
        >
          Reintentar
        </Button>
      }
    />
  );
}

/**
 * Extracts a human-readable message from an unknown RTK Query / Axios error,
 * falling back to a Spanish sentence when the backend sent none. Shared so
 * every `RequestError` consumer renders the failure the same way.
 */
export function requestErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

/** Default Spanish detail for a request that failed without a backend message. */
export const REQUEST_ERROR_FALLBACK =
  "Revisa tu conexión e intenta de nuevo.";

export default RequestError;

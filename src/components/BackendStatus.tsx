"use client";

import { useEffect, useRef } from "react";
import { App } from "antd";

import { getHealth } from "../api/backend";

/**
 * One-shot backend health check that reports through a toast.
 *
 * This renders no markup: the owner asked for a clean UI, so there is no
 * persistent status chip and no 30-second poll. It mounts once in the shell
 * (which never unmounts across a route change), so a session issues exactly one
 * `GET /health`.
 *
 * The `useRef` guard is what makes it StrictMode-safe. React StrictMode
 * double-invokes a mount effect (setup -> cleanup -> setup on the same
 * instance), and a ref survives that simulated remount, so the health request
 * and its toast run exactly once. A module-level flag would make the guard
 * global and hostile to test isolation; a `useState` flag read inside the same
 * effect would still see its pre-update value and fire twice.
 *
 * There is deliberately no "cancelled" teardown flag: this component holds no
 * state, and the notification API is process-global and safe to call after
 * unmount. Cancelling on the StrictMode cleanup would swallow the only
 * notification the app is meant to show.
 */
export function BackendStatus() {
  const { notification } = App.useApp();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) {
      return;
    }
    checkedRef.current = true;

    getHealth()
      .then(() => {
        notification.success({
          title: "Conexión establecida",
          description: "El servicio respondió correctamente.",
        });
      })
      .catch(() => {
        notification.error({
          title: "Sin conexión con el servicio",
          description:
            "No pudimos contactar al backend. Algunos datos pueden no estar disponibles.",
        });
      });
  }, [notification]);

  return null;
}

export default BackendStatus;

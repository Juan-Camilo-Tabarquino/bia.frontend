"use client";
import { useEffect, useState, useRef } from "react";

import { getHealth } from "../api/backend";
import { Result, Spin } from "antd";

type BackendStatus = "unknown" | "healthy" | "unhealthy";

// Screen-reader text for the live region, independent of the visual wording.
const statusLabel: Record<BackendStatus, string> = {
  unknown: "Backend status unknown",
  healthy: "Backend status: healthy",
  unhealthy: "Backend status: unhealthy",
};

export default function HealthStatus() {
  // Backend status: "unknown" (no check yet), "healthy" or "unhealthy"
  const [status, setStatus] = useState<BackendStatus>("unknown");
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Loading flag only for the very first request (spinner)
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const check = async () => {
    // No need to setLoading on every poll – keep spinner only for the first call
    try {
      const res = await getHealth();
      const newStatus: BackendStatus =
        res.status === 200 ? "healthy" : "unhealthy";
      if (statusRef.current !== newStatus) setStatus(newStatus);
    } catch {
      if (statusRef.current !== "unhealthy") setStatus("unhealthy");
    } finally {
      if (loadingRef.current) setLoading(false);
    }
  };

  // Initial check + poll every 30 seconds (less intrusive than every 5 s)
  useEffect(() => {
    (async () => {
      await check();
    })();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div aria-live="polite" role="status">
      {loading ? (
        <Spin />
      ) : (
        <Result
          status={status === "healthy" ? "success" : "error"}
          title={status === "healthy" ? "Backend Up" : "Backend Down"}
        />
      )}
      <span className="sr-only">{statusLabel[status]}</span>
    </div>
  );
}

"use client";

import { Alert } from "antd";

/**
 * Block-level explanation for `DATA_QUALITY` records: they describe a problem
 * with the measurements, not a consumption anomaly.
 */
export function DataQualityNotice() {
  return (
    <Alert
      type="warning"
      showIcon
      title="Problema de calidad de datos"
      description="Este registro marca un problema con las mediciones del medidor (lecturas incorrectas o faltantes). No es una anomalía real de consumo, así que revisa la medición, no el consumo."
      role="note"
      aria-label="Explicación del problema de calidad de datos"
    />
  );
}

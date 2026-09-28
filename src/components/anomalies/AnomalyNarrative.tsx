"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, Typography } from "antd";
import styles from "./AnomalyNarrative.module.scss";

const { Paragraph } = Typography;

interface AnomalyNarrativeProps {
  /** Markdown narrative from the backend; absent when the LLM is disabled. */
  analysis?: string;
}

/**
 * Optional LLM narrative for an anomaly.
 *
 * The backend sends `llm_analysis` as markdown (bold lead line, headings and
 * GFM tables), so it is rendered with `react-markdown` + `remark-gfm`.
 * `react-markdown`'s default safe behaviour is kept: raw HTML stays disabled,
 * with no raw-HTML plugin and no unsafe inner-HTML escape hatch, so the model
 * cannot inject markup. The narrative is additive - the deterministic
 * `reason` and `recommended_action` remain the authoritative record.
 */
export function AnomalyNarrative({ analysis }: AnomalyNarrativeProps) {
  const narrative = analysis?.trim() ?? "";

  return (
    <Card>
      <section aria-labelledby="llm-narrative-heading">
        <h2 id="llm-narrative-heading" className={styles.heading}>
          Narrativa del LLM
        </h2>
        <Paragraph type="secondary" className={styles.note}>
          Interpretación generada por el LLM para esta anomalía. Es contexto
          adicional y nunca reemplaza el motivo determinístico, la acción
          recomendada ni las estadísticas de arriba.
        </Paragraph>
        {narrative.length === 0 ? (
          <Paragraph className={styles.empty}>
            La narrativa se genera bajo demanda: corré el análisis con IA desde
            la página del medidor para producirla.
          </Paragraph>
        ) : (
          <div className={styles.narrative}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {narrative}
            </ReactMarkdown>
          </div>
        )}
      </section>
    </Card>
  );
}

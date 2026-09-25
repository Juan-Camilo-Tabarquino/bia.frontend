"use client";

import Link from "next/link";
import { Alert, Button, Space, Typography } from "antd";
import {
  useGetAiAnalysisQuery,
  usePostAnalyzeMutation,
} from "@/features/dashboards/dashboardAPI";
import { AnomalyNarrative } from "./AnomalyNarrative";
import styles from "./AiReanalysis.module.scss";

const { Text } = Typography;

/** Latency disclosure shown both before and during the request. */
const LATENCY_HELPER =
  "Re-runs the deterministic anomaly pipeline and the LLM narrative for every anomaly, then loads the result. It can take about a minute.";
const RUNNING_MESSAGE = "Analysis is running. It may take about a minute.";
const FALLBACK_ERROR =
  "The platform analysis could not be completed. Try again.";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

/**
 * On-demand trigger for the backend's AI analysis.
 *
 * `POST /api/ai/analyze` reads no body and is synchronous: in a single request
 * it re-runs the deterministic pipeline and then the LLM narrative, so it can
 * legitimately stay pending for about a minute. This block states that openly
 * and never hides it behind a bare spinner. `GET /api/ai/analysis/{id}` always
 * answers `"status":"completed"`, so there is no pending state to poll.
 *
 * The action is additive: the deterministic anomaly list already on the page
 * remains the source of truth and is never replaced, reordered or mutated.
 *
 * The result's `anomalies` array inherits the same deterministic priority
 * ordering as `GET /api/anomalies`: the backend maps both the list endpoint and
 * this stored snapshot through one shared helper (`anomalyDTOs` over
 * `sortedEvidence`), so element `0` is the most urgent anomaly.
 */
export function AiReanalysis() {
  const [postAnalyze, { isLoading, data, error }] = usePostAnalyzeMutation();
  const analysisId = data?.analysisId ?? "";

  const { data: result, error: resultError } = useGetAiAnalysisQuery(
    analysisId,
    { skip: analysisId.length === 0 },
  );

  const topAnomaly = result?.anomalies[0];
  const failed = Boolean(error) || Boolean(resultError);

  return (
    <section aria-label="AI analysis" className={styles.section}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Button
            type="primary"
            onClick={() => {
              void postAnalyze();
            }}
            loading={isLoading}
            disabled={isLoading}
            aria-describedby="ai-reanalysis-latency"
          >
            Re-run platform analysis
          </Button>
          <Text
            id="ai-reanalysis-latency"
            type="secondary"
            className={styles.helper}
          >
            {LATENCY_HELPER}
          </Text>
        </div>

        {isLoading && (
          <Text role="status" className={styles.status}>
            {RUNNING_MESSAGE}
          </Text>
        )}

        {!isLoading && failed && (
          <Alert
            type="error"
            showIcon
            title="Analysis failed"
            description={getErrorMessage(
              error ?? resultError,
              FALLBACK_ERROR,
            )}
          />
        )}

        {!isLoading && !failed && result && (
          <div className={styles.result}>
            <Text role="status" className={styles.status}>
              {result.anomalies.length === 0
                ? "Analysis complete: no anomalies were returned."
                : `Analysis complete: ${result.anomalies.length} ${
                    result.anomalies.length === 1 ? "anomaly" : "anomalies"
                  } returned.`}
            </Text>

            {topAnomaly && (
              <div className={styles.topAnomaly}>
                <Text strong>Top-priority anomaly</Text>
                <div className={styles.linkRow}>
                  <Link
                    href={`/anomalies/${encodeURIComponent(topAnomaly.id)}`}
                  >
                    {topAnomaly.id}
                  </Link>
                </div>
                <AnomalyNarrative analysis={topAnomaly.llm_analysis} />
              </div>
            )}
          </div>
        )}
      </Space>
    </section>
  );
}

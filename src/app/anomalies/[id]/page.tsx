"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Result, Spin, Typography } from "antd";
import { useGetAnomalyByIdQuery } from "@/features/api/apiSlice";
import { AnomalyDetail } from "@/components/anomalies/AnomalyDetail";

const { Title } = Typography;

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const { status, originalStatus } = error as {
    status?: unknown;
    originalStatus?: unknown;
  };
  return status === 404 || originalStatus === 404;
}

function backLink() {
  return <Link href="/anomalies">Back to anomalies</Link>;
}

/**
 * Investigation view for `GET /api/anomalies/{id}`.
 *
 * An unknown id makes the backend answer `404`, which is rendered as a
 * dedicated not-found state with a way back to the list.
 */
export default function AnomalyInvestigationPage() {
  const params = useParams();
  const rawId = params?.id;
  const anomalyId = Array.isArray(rawId) ? rawId[0] ?? "" : rawId ?? "";

  const { data, error, isLoading } = useGetAnomalyByIdQuery(anomalyId, {
    skip: anomalyId.length === 0,
  });

  let content;
  if (anomalyId.length === 0) {
    content = (
      <Result
        status="404"
        title="Anomaly not found"
        subTitle="No anomaly id was provided in the route."
        extra={backLink()}
      />
    );
  } else if (isLoading) {
    content = <Spin />;
  } else if (isNotFound(error)) {
    content = (
      <Result
        status="404"
        title="Anomaly not found"
        subTitle={`No anomaly matches id "${anomalyId}".`}
        extra={backLink()}
      />
    );
  } else if (error) {
    content = (
      <Result
        status="error"
        title="Could not load anomaly"
        subTitle="The anomaly could not be loaded from the backend."
        extra={backLink()}
      />
    );
  } else if (data) {
    content = <AnomalyDetail anomaly={data} />;
  } else {
    content = (
      <Result
        status="404"
        title="Anomaly not found"
        subTitle={`No anomaly matches id "${anomalyId}".`}
        extra={backLink()}
      />
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      <Title level={1}>Anomaly investigation</Title>
      {content}
    </div>
  );
}

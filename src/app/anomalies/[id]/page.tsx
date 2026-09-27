"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Result, Skeleton, Space, Typography } from "antd";
import { useGetAnomalyByIdQuery } from "@/features/api/apiSlice";
import { AnomalyDetail } from "@/components/anomalies/AnomalyDetail";
import {
  RequestError,
  requestErrorMessage,
  REQUEST_ERROR_FALLBACK,
} from "@/components/RequestError";

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
  return <Link href="/anomalies">Volver a las anomalías</Link>;
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

  const { data, error, isLoading, isFetching, refetch } = useGetAnomalyByIdQuery(
    anomalyId,
    {
      skip: anomalyId.length === 0,
    },
  );

  let content;
  if (anomalyId.length === 0) {
    content = (
      <Result
        status="404"
        title="Anomalía no encontrada"
        subTitle="No se proporcionó ningún id de anomalía en la ruta."
        extra={backLink()}
      />
    );
  } else if (isLoading) {
    content = <Skeleton active paragraph={{ rows: 8 }} />;
  } else if (isNotFound(error)) {
    content = (
      <Result
        status="404"
        title="Anomalía no encontrada"
        subTitle={`Ninguna anomalía coincide con el id "${anomalyId}".`}
        extra={backLink()}
      />
    );
  } else if (error) {
    content = (
      <Space orientation="vertical" size="middle">
        <RequestError
          title="No se pudo cargar la anomalía"
          description={requestErrorMessage(error, REQUEST_ERROR_FALLBACK)}
          onRetry={() => {
            void refetch();
          }}
          retrying={isFetching}
        />
        {backLink()}
      </Space>
    );
  } else if (data) {
    content = <AnomalyDetail anomaly={data} />;
  } else {
    content = (
      <Result
        status="404"
        title="Anomalía no encontrada"
        subTitle={`Ninguna anomalía coincide con el id "${anomalyId}".`}
        extra={backLink()}
      />
    );
  }

  return (
    // The shell container owns the horizontal gutter on every route; this page
    // keeps only the vertical padding so its title aligns at x=144.
    <div style={{ paddingBlock: "1rem" }}>
      <Title level={1}>Investigación de la anomalía</Title>
      {content}
    </div>
  );
}

import React from "react";
import { render, screen } from "@testing-library/react";
import type { Anomaly } from "@/types/backend";
import AnomalyInvestigationPage from "../page";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("@/features/api/apiSlice", () => ({
  useGetAnomalyByIdQuery: jest.fn(),
}));

import { useParams } from "next/navigation";
import { useGetAnomalyByIdQuery } from "@/features/api/apiSlice";

const mockedUseParams = useParams as jest.Mock;
const mockedUseGetAnomalyByIdQuery = useGetAnomalyByIdQuery as jest.Mock;

const anomaly: Anomaly = {
  id: "M-109-2026-09-12T14:00:00Z",
  meter_id: "M-109",
  detected_at: "2026-09-12T14:00:00Z",
  type: "REAL_ANOMALY",
  severity: "HIGH",
  confidence: 0.97,
  reason: "Consumption spike",
  recommended_action: "Inspect the meter",
  status: "unexplained",
  priority: 1,
  baseline: {
    mean: 52.16,
    stddev: 20.84,
    count: 336,
    voltage_mean: 219.38,
    current_mean: 238.82,
    power_factor_mean: 0.905,
  },
  consumption_change_pct: 125.28,
  voltage_change_pct: -2.71,
  current_change_pct: 111.16,
  power_factor_change_pct: -18.16,
  correlated_events: [],
  data_quality: { flagged: false, reason: "" },
};

describe("AnomalyInvestigationPage", () => {
  beforeEach(() => {
    mockedUseParams.mockReset();
    mockedUseGetAnomalyByIdQuery.mockReset();
    mockedUseParams.mockReturnValue({ id: "M-109-2026-09-12T14:00:00Z" });
    mockedUseGetAnomalyByIdQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
  });

  it("renders exactly one h1 while loading", () => {
    mockedUseGetAnomalyByIdQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    const { container } = render(<AnomalyInvestigationPage />);

    expect(container.querySelector(".ant-spin")).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveAccessibleName("Anomaly investigation");
  });

  it("requests the anomaly for the routed id", () => {
    render(<AnomalyInvestigationPage />);

    expect(mockedUseGetAnomalyByIdQuery).toHaveBeenCalledWith(
      "M-109-2026-09-12T14:00:00Z",
      { skip: false },
    );
  });

  it("renders the full investigation detail when the anomaly loads", () => {
    mockedUseGetAnomalyByIdQuery.mockReturnValue({
      data: anomaly,
      isLoading: false,
      error: undefined,
    });

    render(<AnomalyInvestigationPage />);

    expect(screen.getByText("Consumption spike")).toBeInTheDocument();
    expect(screen.getByText("Inspect the meter")).toBeInTheDocument();
    expect(screen.getByText("97%")).toBeInTheDocument();
    expect(screen.getByText("Causal reading")).toBeInTheDocument();
  });

  it("renders the statistical evidence blocks when the anomaly loads", () => {
    mockedUseGetAnomalyByIdQuery.mockReturnValue({
      data: anomaly,
      isLoading: false,
      error: undefined,
    });

    render(<AnomalyInvestigationPage />);

    expect(screen.getByText("Baseline")).toBeInTheDocument();
    expect(screen.getByText("Change vs baseline")).toBeInTheDocument();
    expect(screen.getByText("+125.3%")).toBeInTheDocument();
    expect(
      screen.getByText(/No correlated event explains this deviation/i),
    ).toBeInTheDocument();
  });

  it("renders a 404 not-found state with a way back to the list", () => {
    mockedUseGetAnomalyByIdQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 404, data: { error: "anomaly x not found" } },
    });

    render(<AnomalyInvestigationPage />);

    expect(screen.getByText("Anomaly not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to anomalies" }),
    ).toHaveAttribute("href", "/anomalies");
  });

  it("renders a generic error state that is not mistaken for a 404", () => {
    mockedUseGetAnomalyByIdQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 500, data: { error: "boom" } },
    });

    render(<AnomalyInvestigationPage />);

    expect(screen.getByText("Could not load anomaly")).toBeInTheDocument();
    expect(screen.queryByText("Anomaly not found")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to anomalies" }),
    ).toHaveAttribute("href", "/anomalies");
  });

  it("treats a missing route id as not found and skips the request", () => {
    mockedUseParams.mockReturnValue({});

    render(<AnomalyInvestigationPage />);

    expect(screen.getByText("Anomaly not found")).toBeInTheDocument();
    expect(mockedUseGetAnomalyByIdQuery).toHaveBeenCalledWith("", {
      skip: true,
    });
  });
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Anomaly } from "@/types/backend";
import { anomalySortDefinitions } from "../anomalyFiltering";
import { AnomalyTable } from "../AnomalyTable";

const realAnomaly: Anomaly = {
  id: "M-109-2026-09-12T14:00:00Z",
  meter_id: "M-109",
  detected_at: "2026-09-12T14:00:00Z",
  type: "REAL_ANOMALY",
  severity: "HIGH",
  confidence: 0.97,
  reason: "Sudden consumption spike",
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

const dataQualityAnomaly: Anomaly = {
  id: "M-112-2026-09-10T09:00:00Z",
  meter_id: "M-112",
  detected_at: "2026-09-10T09:00:00Z",
  type: "DATA_QUALITY",
  severity: "HIGH",
  confidence: 0.9,
  reason: "Missing readings",
  recommended_action: "Check the meter wiring",
  status: "explained",
  priority: 2,
  baseline: {
    mean: 27.55,
    stddev: 4.77,
    count: 336,
    voltage_mean: 221.1,
    current_mean: 125.54,
    power_factor_mean: 0.94,
  },
  consumption_change_pct: -26.42,
  voltage_change_pct: 8.43,
  current_change_pct: 28.78,
  power_factor_change_pct: -23.38,
  correlated_events: [
    {
      id: "M-112",
      type: "DATA_QUALITY",
      start: "2026-09-13T00:00:00Z",
      end: "2026-09-13T00:00:00Z",
      description: "Intermittent readings and abnormal electrical jumps",
    },
  ],
  data_quality: { flagged: true, reason: "power factor 0.720 below 0.85" },
};

describe("AnomalyTable", () => {
  it("renders every required field for each anomaly", () => {
    render(<AnomalyTable anomalies={[realAnomaly]} />);

    expect(
      screen.getByRole("link", { name: realAnomaly.id }),
    ).toHaveAttribute("href", `/anomalies/${realAnomaly.id}`);
    expect(screen.getByText("M-109")).toBeInTheDocument();
    expect(screen.getByText("2026-09-12T14:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("REAL_ANOMALY")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("97%")).toBeInTheDocument();
    expect(screen.getByText("Unexplained")).toBeInTheDocument();
  });

  it("shows the API priority value in a Priority column", () => {
    render(<AnomalyTable anomalies={[realAnomaly, dataQualityAnomaly]} />);

    expect(
      screen.getByRole("columnheader", { name: "Priority" }),
    ).toBeInTheDocument();
    // The values are the API numbers, shown verbatim.
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders DATA_QUALITY rows with a plain-language measurement label", () => {
    render(<AnomalyTable anomalies={[dataQualityAnomaly]} />);

    expect(screen.getByText("DATA_QUALITY")).toBeInTheDocument();
    expect(screen.getByText("Data quality issue")).toBeInTheDocument();
  });

  it("does not add the data-quality label to real anomalies", () => {
    render(<AnomalyTable anomalies={[realAnomaly]} />);

    expect(screen.queryByText("Data quality issue")).not.toBeInTheDocument();
  });

  it("marks the DATA_QUALITY row as visually distinct", () => {
    const { container } = render(
      <AnomalyTable anomalies={[realAnomaly, dataQualityAnomaly]} />,
    );

    const rows = Array.from(container.querySelectorAll("tbody tr"));
    const dataQualityRow = rows.find((row) =>
      row.textContent?.includes("M-112"),
    );

    expect(dataQualityRow?.className).toContain("dataQualityRow");
  });
});

describe("AnomalyTable header sorting", () => {
  it("stays a plain preview with no sort affordance when no caller owns the sort", () => {
    // This is the dashboard contract: the 5-row preview has no `useUrlState`, so
    // it must not gain an arrow that would lead nowhere and diverge from its
    // "priority order" caption.
    const { container } = render(
      <AnomalyTable anomalies={[realAnomaly, dataQualityAnomaly]} />,
    );

    expect(
      container.querySelectorAll(".ant-table-column-has-sorters"),
    ).toHaveLength(0);
    expect(
      screen.getByRole("link", { name: realAnomaly.id }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: dataQualityAnomaly.id }),
    ).toBeInTheDocument();
  });

  it("offers a sorter on the triage columns only", () => {
    const { container } = render(
      <AnomalyTable
        anomalies={[realAnomaly]}
        sortKey="backend"
        onSortChange={jest.fn()}
      />,
    );

    const sortableTitles = Array.from(
      container.querySelectorAll("thead th.ant-table-column-has-sorters"),
    ).map((header) => header.getAttribute("aria-label"));

    // identifiers (`id`, `meter_id`) and unordered categories (`type`,
    // `status`) deliberately get no sorter.
    expect(sortableTitles).toEqual([
      "Priority",
      "Detected at",
      "Severity",
      "Confidence",
    ]);
  });

  it("asks the caller for the ordering named by the clicked header", () => {
    const onSortChange = jest.fn();
    render(
      <AnomalyTable
        anomalies={[realAnomaly, dataQualityAnomaly]}
        sortKey="backend"
        onSortChange={onSortChange}
      />,
    );

    fireEvent.click(screen.getByRole("columnheader", { name: "Severity" }));

    expect(onSortChange).toHaveBeenCalledWith("severity");
  });

  it("returns to the API order when the active header is clicked again", () => {
    const onSortChange = jest.fn();
    render(
      <AnomalyTable
        anomalies={[realAnomaly, dataQualityAnomaly]}
        sortKey="severity"
        onSortChange={onSortChange}
      />,
    );

    fireEvent.click(screen.getByRole("columnheader", { name: "Severity" }));

    expect(onSortChange).toHaveBeenCalledWith("backend");
  });

  it("clears the previous arrow when a second sortable header is clicked", () => {
    const onSortChange = jest.fn();
    const { rerender } = render(
      <AnomalyTable
        anomalies={[realAnomaly, dataQualityAnomaly]}
        sortKey="severity"
        onSortChange={onSortChange}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Severity" }),
    ).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(screen.getByRole("columnheader", { name: "Confidence" }));
    expect(onSortChange).toHaveBeenCalledWith("confidence");

    // The caller owns the value, so the switch shows once it feeds it back.
    rerender(
      <AnomalyTable
        anomalies={[realAnomaly, dataQualityAnomaly]}
        sortKey="confidence"
        onSortChange={onSortChange}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Confidence" }),
    ).toHaveAttribute("aria-sort", "descending");
    expect(
      screen.getByRole("columnheader", { name: "Severity" }),
    ).not.toHaveAttribute("aria-sort");
  });

  // A definition without a matching column would still be accepted from a
  // `?sort=` link and still order the rows, but no header would exist to show
  // or change it: a silent divergence. This pins the two lists together.
  it("offers exactly the sortable keys the registry declares", () => {
    render(
      <AnomalyTable
        anomalies={[realAnomaly]}
        sortKey="backend"
        onSortChange={jest.fn()}
      />,
    );

    const sortableTitles = screen
      .getAllByRole("columnheader")
      .filter((header) => header.querySelector(".ant-table-column-sorter"))
      .map((header) => header.textContent);

    expect(sortableTitles).toHaveLength(anomalySortDefinitions.length);
  });

  it("shows the caller's ordering as the only active arrow", () => {
    render(
      <AnomalyTable
        anomalies={[realAnomaly, dataQualityAnomaly]}
        sortKey="detected_at"
        onSortChange={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Detected at" }),
    ).toHaveAttribute("aria-sort", "descending");
    // No stale arrow survives on the other sortable headers.
    for (const name of ["Priority", "Severity", "Confidence"]) {
      expect(screen.getByRole("columnheader", { name })).not.toHaveAttribute(
        "aria-sort",
      );
    }
  });

  it("marks priority ascending and leaves backend represented by no arrow", () => {
    const { rerender } = render(
      <AnomalyTable
        anomalies={[realAnomaly]}
        sortKey="priority"
        onSortChange={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Priority" }),
    ).toHaveAttribute("aria-sort", "ascending");

    rerender(
      <AnomalyTable
        anomalies={[realAnomaly]}
        sortKey="backend"
        onSortChange={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Priority" }),
    ).not.toHaveAttribute("aria-sort");
  });
});

import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

/** Builds `count` distinct anomalies so a page's rows can be told apart. */
function makeAnomalies(count: number): Anomaly[] {
  return Array.from({ length: count }, (_unused, index) => ({
    ...realAnomaly,
    id: `A-${String(index + 1).padStart(3, "0")}`,
    meter_id: `M-${100 + index}`,
    priority: index + 1,
  }));
}

/** The anomaly links currently on screen, in row order (meter links excluded). */
function renderedAnomalyIds(): string[] {
  return screen
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/anomalies/"))
    .map((link) => link.textContent ?? "");
}

function anomalyIds(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_unused, index) =>
    `A-${String(from + index).padStart(3, "0")}`,
  );
}

/** The paginator's own subtree, so page items cannot be confused with cells. */
function paginatorOf(container: HTMLElement) {
  const element = container.querySelector(".ant-pagination");
  if (!element) {
    throw new Error("expected the table to render a paginator");
  }
  return within(element as HTMLElement);
}

describe("AnomalyTable", () => {
  it("renders every required field for each anomaly", () => {
    render(<AnomalyTable anomalies={[realAnomaly]} />);

    expect(
      screen.getByRole("link", { name: realAnomaly.id }),
    ).toHaveAttribute("href", `/anomalies/${realAnomaly.id}`);
    expect(
      screen.getByRole("link", { name: realAnomaly.meter_id }),
    ).toHaveAttribute("href", `/meter/${realAnomaly.meter_id}`);
    expect(screen.getByText("2026-09-12T14:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("REAL_ANOMALY")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("97%")).toBeInTheDocument();
    expect(screen.getByText("Unexplained")).toBeInTheDocument();
  });

  it("links each meter id to its meter detail route", () => {
    render(<AnomalyTable anomalies={[realAnomaly, dataQualityAnomaly]} />);

    // The text stays the meter id verbatim, so the link names which meter it
    // points at instead of hiding it behind a label.
    expect(screen.getByRole("link", { name: "M-109" })).toHaveAttribute(
      "href",
      "/meter/M-109",
    );
    expect(screen.getByRole("link", { name: "M-112" })).toHaveAttribute(
      "href",
      "/meter/M-112",
    );
  });

  it("keeps the anomaly and meter links as two addressable sibling links", () => {
    render(<AnomalyTable anomalies={[realAnomaly]} />);

    const anomalyLink = screen.getByRole("link", { name: realAnomaly.id });
    const meterLink = screen.getByRole("link", { name: realAnomaly.meter_id });

    // Distinct accessible names, and neither anchor is nested inside the other
    // (nested links would be an accessibility and DOM problem).
    expect(anomalyLink.contains(meterLink)).toBe(false);
    expect(meterLink.contains(anomalyLink)).toBe(false);
  });

  it("encodes a meter id with reserved characters the same way the reverse link does", () => {
    // `MeterId` is a bare string, so a reserved character is possible even
    // though the seeded ids are `M-<digits>`. This is the exact encoding
    // `MeterDetail` applies to its anomaly link.
    render(
      <AnomalyTable anomalies={[{ ...realAnomaly, meter_id: "M 109/A" }]} />,
    );

    expect(screen.getByRole("link", { name: "M 109/A" })).toHaveAttribute(
      "href",
      "/meter/M%20109%2FA",
    );
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

describe("AnomalyTable pagination", () => {
  it("splits the list across pages at the readings table page size", () => {
    const { container } = render(
      <AnomalyTable anomalies={makeAnomalies(25)} onSortChange={jest.fn()} />,
    );

    // Ten rows, the same page size `ReadingsTable` uses, and the page buttons
    // antd derives from the row count.
    expect(renderedAnomalyIds()).toEqual(anomalyIds(1, 10));
    expect(paginatorOf(container).getByTitle("3")).toBeInTheDocument();

    fireEvent.click(paginatorOf(container).getByTitle("2"));
    expect(renderedAnomalyIds()).toEqual(anomalyIds(11, 20));

    fireEvent.click(paginatorOf(container).getByTitle("3"));
    expect(renderedAnomalyIds()).toEqual(anomalyIds(21, 25));
  });

  it("keeps the dashboard preview control-free and renders every row", () => {
    // The dashboard passes no `onSortChange`, which is what marks the table as a
    // static preview. It must gain neither a sort arrow nor a paginator.
    const { container } = render(<AnomalyTable anomalies={makeAnomalies(5)} />);

    expect(container.querySelector(".ant-pagination")).toBeNull();
    expect(renderedAnomalyIds()).toHaveLength(5);
  });

  it("uses antd's own single-page paginator for an interactive list", () => {
    // antd shows the paginator even for a single page; the full list keeps that
    // default (like `ReadingsTable`), unlike the preview above, which opts out.
    const { container } = render(
      <AnomalyTable anomalies={makeAnomalies(10)} onSortChange={jest.fn()} />,
    );

    expect(renderedAnomalyIds()).toEqual(anomalyIds(1, 10));
    expect(container.querySelectorAll(".ant-pagination-item")).toHaveLength(1);
    expect(paginatorOf(container).getByTitle("1")).toHaveClass(
      "ant-pagination-item-active",
    );
  });

  it("honours an explicit pagination opt-out", () => {
    const { container } = render(
      <AnomalyTable
        anomalies={makeAnomalies(25)}
        onSortChange={jest.fn()}
        pagination={false}
      />,
    );

    expect(container.querySelector(".ant-pagination")).toBeNull();
    expect(renderedAnomalyIds()).toHaveLength(25);
  });

  it("does not leave the user on a page the list no longer has", () => {
    const { container, rerender } = render(
      <AnomalyTable anomalies={makeAnomalies(25)} onSortChange={jest.fn()} />,
    );

    fireEvent.click(paginatorOf(container).getByTitle("3"));
    expect(renderedAnomalyIds()).toEqual(anomalyIds(21, 25));

    // The list shrinks to a single page: page 3 cannot survive it.
    rerender(
      <AnomalyTable anomalies={makeAnomalies(4)} onSortChange={jest.fn()} />,
    );

    expect(renderedAnomalyIds()).toEqual(anomalyIds(1, 4));
    expect(paginatorOf(container).getByTitle("1")).toHaveClass(
      "ant-pagination-item-active",
    );
  });

  it("does not jump back to an abandoned page when the list grows again", () => {
    const { container, rerender } = render(
      <AnomalyTable anomalies={makeAnomalies(25)} onSortChange={jest.fn()} />,
    );

    fireEvent.click(paginatorOf(container).getByTitle("3"));
    expect(renderedAnomalyIds()).toEqual(anomalyIds(21, 25));

    rerender(
      <AnomalyTable anomalies={makeAnomalies(4)} onSortChange={jest.fn()} />,
    );
    rerender(
      <AnomalyTable anomalies={makeAnomalies(25)} onSortChange={jest.fn()} />,
    );

    // The page was RESET when the list shrank, so growing it back starts at the
    // top instead of resurrecting page 3 the user already left behind. Clamping
    // alone would resurrect it.
    expect(renderedAnomalyIds()).toEqual(anomalyIds(1, 10));
    expect(paginatorOf(container).getByTitle("1")).toHaveClass(
      "ant-pagination-item-active",
    );
  });

  it("never shows a page that no longer exists when the page count shrinks", () => {
    const { container, rerender } = render(
      <AnomalyTable anomalies={makeAnomalies(25)} onSortChange={jest.fn()} />,
    );

    fireEvent.click(paginatorOf(container).getByTitle("3"));
    expect(renderedAnomalyIds()).toEqual(anomalyIds(21, 25));

    // A larger page size turns the three pages into one. The row count is
    // unchanged, so the reset above cannot fire: antd's own current-clamping is
    // what has to keep the user off a page that no longer exists.
    rerender(
      <AnomalyTable
        anomalies={makeAnomalies(25)}
        onSortChange={jest.fn()}
        pagination={{ pageSize: 25 }}
      />,
    );

    expect(renderedAnomalyIds()).toEqual(anomalyIds(1, 25));
    expect(container.querySelectorAll(".ant-pagination-item")).toHaveLength(1);
    expect(paginatorOf(container).getByTitle("1")).toHaveClass(
      "ant-pagination-item-active",
    );
  });

  it("renders no paginator for an empty list", () => {
    // The page never reaches this state (it shows its own empty state instead),
    // but the component must still be sane: antd itself drops the paginator when
    // there is nothing to page, which is the one-page boundary already handled.
    const { container } = render(
      <AnomalyTable anomalies={[]} onSortChange={jest.fn()} />,
    );

    expect(renderedAnomalyIds()).toEqual([]);
    expect(container.querySelector(".ant-pagination")).toBeNull();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("leaves the paginator's strings to antd and keeps its controls reachable", () => {
    const { container } = render(
      <AnomalyTable anomalies={makeAnomalies(25)} onSortChange={jest.fn()} />,
    );
    const paginator = paginatorOf(container);

    // antd's own (still English; phase 6 localises them) control names and page
    // numbers are all reachable...
    expect(paginator.getByTitle("Previous Page")).toBeInTheDocument();
    expect(paginator.getByTitle("Next Page")).toBeInTheDocument();
    expect(paginator.getByTitle("2")).toBeInTheDocument();
    // ...and this table adds no total label of its own that could stay
    // untranslated or restate the count the page status owns.
    expect(container.querySelector(".ant-pagination-total-text")).toBeNull();
  });
});

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Anomaly } from "@/types/backend";
import AnomaliesPage from "../page";

jest.mock("@/features/api/apiSlice", () => ({
  useGetAnomaliesQuery: jest.fn(),
  useGetMetersQuery: jest.fn(),
}));

// The page now mounts `AiReanalysis`, whose RTK Query hooks need a store
// provider the page suite does not use. Mock them to the idle state so the
// page's own behaviour stays under test without a Redux Provider.
jest.mock("@/features/dashboards/dashboardAPI", () => ({
  usePostAnalyzeMutation: jest.fn(),
  useGetAiAnalysisQuery: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

import {
  useGetAnomaliesQuery,
  useGetMetersQuery,
} from "@/features/api/apiSlice";
import {
  useGetAiAnalysisQuery,
  usePostAnalyzeMutation,
} from "@/features/dashboards/dashboardAPI";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// jsdom does not implement MessageChannel, which rc-select (antd Select) uses to
// schedule its open/close macro-tasks. Provide a minimal stand-in in this suite
// so the dropdown can open; the repository-wide shims live in jest.setup.ts.
class FakeMessagePort {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  private peer: FakeMessagePort | null = null;

  link(peer: FakeMessagePort): void {
    this.peer = peer;
  }

  postMessage(data: unknown): void {
    setTimeout(() => this.peer?.onmessage?.({
      data,
    }), 0);
  }
}

class FakeMessageChannel {
  readonly port1 = new FakeMessagePort();
  readonly port2 = new FakeMessagePort();

  constructor() {
    this.port1.link(this.port2);
    this.port2.link(this.port1);
  }
}

if (typeof globalThis.MessageChannel === "undefined") {
  globalThis.MessageChannel = FakeMessageChannel as unknown as typeof MessageChannel;
}

const mockedUseGetAnomaliesQuery = useGetAnomaliesQuery as jest.Mock;
const mockedUseGetMetersQuery = useGetMetersQuery as jest.Mock;
const mockedUseSearchParams = useSearchParams as jest.Mock;
const mockedUsePathname = usePathname as jest.Mock;
const mockedUseRouter = useRouter as jest.Mock;
const mockedUsePostAnalyzeMutation = usePostAnalyzeMutation as jest.Mock;
const mockedUseGetAiAnalysisQuery = useGetAiAnalysisQuery as jest.Mock;

const refetch = jest.fn();

// The page now mirrors its filter/sort state into the URL through the router.
// `push` is stubbed but must never be used: a per-change history entry would
// make the back button walk through every filter the user tried.
const replaceUrl = jest.fn();
const pushUrl = jest.fn();

const anomalies: Anomaly[] = [
  {
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
  },
  {
    id: "M-112-2026-09-10T09:00:00Z",
    meter_id: "M-112",
    detected_at: "2026-09-10T09:00:00Z",
    type: "DATA_QUALITY",
    severity: "LOW",
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
  },
];

const sortLabel = "Sort anomalies, applied in the browser over the fetched list";

function mockLoaded(list: Anomaly[] = anomalies): void {
  mockedUseGetAnomaliesQuery.mockReturnValue({
    data: list,
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch,
  });
  mockedUseGetMetersQuery.mockReturnValue({
    data: ["M-109", "M-112"],
    isLoading: false,
    error: undefined,
  });
}

function linkNames(): string[] {
  return screen.getAllByRole("link").map((link) => link.textContent ?? "");
}

async function chooseOption(label: string, optionTitle: string): Promise<void> {
  fireEvent.mouseDown(screen.getByLabelText(label));
  fireEvent.click(await screen.findByTitle(optionTitle));
}

describe("AnomaliesPage", () => {
  beforeEach(() => {
    mockedUseGetAnomaliesQuery.mockReset();
    mockedUseGetMetersQuery.mockReset();
    mockedUseSearchParams.mockReset();
    mockedUseSearchParams.mockReturnValue(new URLSearchParams());
    mockedUsePathname.mockReset();
    mockedUsePathname.mockReturnValue("/anomalies");
    mockedUseRouter.mockReset();
    mockedUseRouter.mockReturnValue({ replace: replaceUrl, push: pushUrl });
    replaceUrl.mockReset();
    pushUrl.mockReset();
    mockedUsePostAnalyzeMutation.mockReset();
    mockedUseGetAiAnalysisQuery.mockReset();
    mockedUsePostAnalyzeMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false, data: undefined, error: undefined },
    ]);
    mockedUseGetAiAnalysisQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    });
    refetch.mockReset();
    mockLoaded();
  });

  it("renders a skeleton while the requests are pending", () => {
    mockedUseGetAnomaliesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: undefined,
      refetch,
    });

    const { container } = render(<AnomaliesPage />);

    expect(container.querySelector(".ant-skeleton")).toBeInTheDocument();
  });

  it("renders the API error message with a retry action when the anomaly request fails", () => {
    mockedUseGetAnomaliesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { message: "Boom" },
      refetch,
    });

    render(<AnomaliesPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state when the backend reports no anomalies", () => {
    mockLoaded([]);

    render(<AnomaliesPage />);

    expect(
      screen.getByText("El backend no reportó anomalías."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Showing 0 of 0 anomalies"),
    ).toBeInTheDocument();
  });

  it("renders the filtered count and the rows in the API priority order", () => {
    render(<AnomaliesPage />);

    expect(screen.getByText("Showing 2 of 2 anomalies")).toBeInTheDocument();
    // The API returns the array sorted by ascending priority: M-109 (1) before
    // M-112 (2). The default view leaves that order untouched.
    expect(linkNames()).toEqual([
      "M-109-2026-09-12T14:00:00Z",
      "M-112-2026-09-10T09:00:00Z",
    ]);
    expect(
      screen.getByRole("columnheader", { name: "Priority" }),
    ).toBeInTheDocument();
  });

  it("re-sorts the fetched list by the API priority field on demand", async () => {
    // Feed the array upside down to prove the priority sort reads the field and
    // does not merely keep the incoming order.
    mockLoaded([anomalies[1], anomalies[0]]);

    render(<AnomaliesPage />);

    expect(linkNames()).toEqual([
      "M-112-2026-09-10T09:00:00Z",
      "M-109-2026-09-12T14:00:00Z",
    ]);

    await chooseOption(sortLabel, "UI sort: priority (most urgent first)");

    await waitFor(() => {
      expect(linkNames()).toEqual([
        "M-109-2026-09-12T14:00:00Z",
        "M-112-2026-09-10T09:00:00Z",
      ]);
    });
  });

  it("filters the fetched list by type without re-querying the backend", async () => {
    render(<AnomaliesPage />);

    await chooseOption("Filter by type", "Data quality issue");

    await waitFor(() => {
      expect(screen.getByText("Showing 1 of 2 anomalies")).toBeInTheDocument();
    });
    expect(linkNames()).toEqual(["M-112-2026-09-10T09:00:00Z"]);
    expect(screen.getByText("DATA_QUALITY")).toBeInTheDocument();
  });

  it("clears every filter with the clear action", async () => {
    render(<AnomaliesPage />);

    await chooseOption("Filter by type", "Data quality issue");
    await waitFor(() => {
      expect(screen.getByText("Showing 1 of 2 anomalies")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() => {
      expect(screen.getByText("Showing 2 of 2 anomalies")).toBeInTheDocument();
    });
  });

  it("reorders the fetched list with the UI severity sort", async () => {
    render(<AnomaliesPage />);

    await chooseOption(sortLabel, "UI sort: severity (high to low)");

    await waitFor(() => {
      expect(linkNames()).toEqual([
        "M-109-2026-09-12T14:00:00Z",
        "M-112-2026-09-10T09:00:00Z",
      ]);
    });
  });

  it("warns when the meter list fails but still shows the anomalies", () => {
    mockedUseGetMetersQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "Nope" },
    });

    render(<AnomaliesPage />);

    expect(
      screen.getByText("Lista de medidores no disponible"),
    ).toBeInTheDocument();
    expect(screen.getByText("Showing 2 of 2 anomalies")).toBeInTheDocument();
  });

  it("pre-filters by meter_id read from the URL without re-querying", () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("meter_id=M-109"));

    render(<AnomaliesPage />);

    expect(screen.getByText("Showing 1 of 2 anomalies")).toBeInTheDocument();
    expect(linkNames()).toEqual(["M-109-2026-09-12T14:00:00Z"]);
  });

  it("restores every filter and the sort from the query string on mount", () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams(
        "meter_id=M-109&type=REAL_ANOMALY&severity=HIGH&status=unexplained" +
          "&detected_from=2026-09-01T00:00:00.000Z" +
          "&detected_to=2026-09-30T23:59:59.999Z&sort=severity",
      ),
    );

    render(<AnomaliesPage />);

    expect(screen.getByText("Showing 1 of 2 anomalies")).toBeInTheDocument();
    expect(linkNames()).toEqual(["M-109-2026-09-12T14:00:00Z"]);
    expect(
      screen.getByText("UI sort: severity (high to low)"),
    ).toBeInTheDocument();
    // Restoring the view is a read-only action: the deep link is not rewritten.
    expect(replaceUrl).not.toHaveBeenCalled();
  });

  it("writes a filter change back to the URL with replace and no history entry", async () => {
    render(<AnomaliesPage />);

    await chooseOption("Filter by type", "Data quality issue");

    await waitFor(() => {
      expect(replaceUrl).toHaveBeenCalledWith("/anomalies?type=DATA_QUALITY", {
        scroll: false,
      });
    });
    expect(pushUrl).not.toHaveBeenCalled();
    expect(screen.getByText("Showing 1 of 2 anomalies")).toBeInTheDocument();
  });

  it("writes a non-default sort to the URL and keeps the default out of it", async () => {
    render(<AnomaliesPage />);

    await chooseOption(sortLabel, "UI sort: severity (high to low)");

    await waitFor(() => {
      expect(replaceUrl).toHaveBeenCalledWith("/anomalies?sort=severity", {
        scroll: false,
      });
    });

    // Going back to the default sort must leave no `sort=backend` behind.
    await chooseOption(sortLabel, "Priority (API order)");

    await waitFor(() => {
      expect(replaceUrl).toHaveBeenLastCalledWith("/anomalies", {
        scroll: false,
      });
    });
  });

  it("removes a cleared filter parameter while keeping the non-default sort", async () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams("type=DATA_QUALITY&sort=priority"),
    );

    render(<AnomaliesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() => {
      expect(replaceUrl).toHaveBeenCalledWith("/anomalies?sort=priority", {
        scroll: false,
      });
    });
  });

  it("ignores invalid query string values instead of crashing or filtering", () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams(
        "meter_id=&type=NOPE&severity=BOGUS&status=??" +
          "&detected_from=not-a-date&sort=whatever",
      ),
    );

    render(<AnomaliesPage />);

    // Every invalid value falls back to its default, so the list is unfiltered...
    expect(screen.getByText("Showing 2 of 2 anomalies")).toBeInTheDocument();
    // ...the default (absent) sort is still selected...
    expect(screen.getByText("Priority (API order)")).toBeInTheDocument();
    // ...and an ignored value is not an active filter.
    expect(
      screen.queryByText(/Filters are applied in the browser/),
    ).not.toBeInTheDocument();
    expect(replaceUrl).not.toHaveBeenCalled();
  });
});

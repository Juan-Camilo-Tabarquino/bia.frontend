import React, { StrictMode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

/** Builds `count` distinct anomalies so a page's rows can be told apart. */
function manyAnomalies(count: number): Anomaly[] {
  return Array.from({ length: count }, (_unused, index) => ({
    ...anomalies[0],
    id: `A-${String(index + 1).padStart(3, "0")}`,
    meter_id: `M-${100 + index}`,
    priority: index + 1,
    // One DATA_QUALITY row, so the type filter has exactly one match.
    type: index === count - 1 ? "DATA_QUALITY" : "REAL_ANOMALY",
  }));
}

/** The anomaly links currently on screen, in row order (meter links excluded). */
function anomalyRowIds(): string[] {
  return screen
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/anomalies/"))
    .map((link) => link.textContent ?? "");
}

function rowIdsFrom(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_unused, index) =>
    `A-${String(from + index).padStart(3, "0")}`,
  );
}

/** The paginator's own subtree, so page items cannot be confused with rows. */
function paginatorOf(container: HTMLElement) {
  const element = container.querySelector(".ant-pagination");
  if (!element) {
    throw new Error("expected the table to render a paginator");
  }
  return within(element as HTMLElement);
}

async function chooseOption(label: string, optionTitle: string): Promise<void> {
  fireEvent.mouseDown(screen.getByLabelText(label));
  fireEvent.click(await screen.findByTitle(optionTitle));
}

/** Clicks a sortable column header, the page's only sorting affordance. */
function clickHeader(name: string): void {
  fireEvent.click(screen.getByRole("columnheader", { name }));
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

  // Same contract as the MeterList suite: the disabled state is only proven by
  // pairing it with the enabled one, because an unpassed `retrying` prop also
  // leaves the button enabled.
  it("disables the retry action while the anomaly refetch is in flight", () => {
    mockedUseGetAnomaliesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true,
      error: { message: "Boom" },
      refetch,
    });

    render(<AnomaliesPage />);

    expect(screen.getByRole("button", { name: /Reintentar/ })).toBeDisabled();
  });

  it("keeps the retry action enabled when the anomaly request is not refetching", () => {
    mockedUseGetAnomaliesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { message: "Boom" },
      refetch,
    });

    render(<AnomaliesPage />);

    expect(
      screen.getByRole("button", { name: /Reintentar/ }),
    ).not.toBeDisabled();
  });

  it("renders an empty state when the backend reports no anomalies", () => {
    mockLoaded([]);

    render(<AnomaliesPage />);

    expect(
      screen.getByText("El backend no reportó anomalías."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("0 de 0 anomalías coinciden con los filtros."),
    ).toBeInTheDocument();
  });

  it("renders the filtered count and the rows in the API priority order", () => {
    render(<AnomaliesPage />);

    expect(screen.getByText("2 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    // The API returns the array sorted by ascending priority: M-109 (1) before
    // M-112 (2). The default view leaves that order untouched. Each row now has
    // two links: the anomaly id first (Anomaly column), then its meter id
    // (Meter column), which is why every expected list is doubled.
    expect(linkNames()).toEqual([
      "M-109-2026-09-12T14:00:00Z",
      "M-109",
      "M-112-2026-09-10T09:00:00Z",
      "M-112",
    ]);
    expect(
      screen.getByRole("columnheader", { name: "Prioridad" }),
    ).toBeInTheDocument();
  });

  it("links each row's meter to its meter route next to the anomaly link", () => {
    render(<AnomaliesPage />);

    // The meter cell is the second link of the row and points at the meter
    // detail route, closing the anomaly -> meter half of the round trip that
    // MeterDetail already opens in the other direction.
    expect(screen.getByRole("link", { name: "M-109" })).toHaveAttribute(
      "href",
      "/meter/M-109",
    );
    expect(screen.getByRole("link", { name: "M-112" })).toHaveAttribute(
      "href",
      "/meter/M-112",
    );
    // The anomaly link in the same row keeps its own destination, so the two
    // links are siblings with distinct names rather than a nested pair.
    expect(
      screen.getByRole("link", { name: "M-109-2026-09-12T14:00:00Z" }),
    ).toHaveAttribute("href", "/anomalies/M-109-2026-09-12T14:00:00Z");
  });

  it("re-sorts the fetched list by the API priority field on demand from the header", async () => {
    // Feed the array upside down to prove the priority sort reads the field and
    // does not merely keep the incoming order.
    mockLoaded([anomalies[1], anomalies[0]]);

    render(<AnomaliesPage />);

    expect(linkNames()).toEqual([
      "M-112-2026-09-10T09:00:00Z",
      "M-112",
      "M-109-2026-09-12T14:00:00Z",
      "M-109",
    ]);

    clickHeader("Prioridad");

    await waitFor(() => {
      expect(linkNames()).toEqual([
        "M-109-2026-09-12T14:00:00Z",
        "M-109",
        "M-112-2026-09-10T09:00:00Z",
        "M-112",
      ]);
    });
    // The header writes the same `sort` key the URL already carries, so the
    // chosen order is deep-linkable.
    expect(replaceUrl).toHaveBeenCalledWith("/anomalies?sort=priority", {
      scroll: false,
    });
  });

  it("filters the fetched list by type without re-querying the backend", async () => {
    render(<AnomaliesPage />);

    await chooseOption("Filtrar por tipo", "Problema de calidad de datos");

    await waitFor(() => {
      expect(screen.getByText("1 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    });
    expect(linkNames()).toEqual(["M-112-2026-09-10T09:00:00Z", "M-112"]);
    expect(screen.getByText("DATA_QUALITY")).toBeInTheDocument();
  });

  it("clears every filter with the clear action", async () => {
    render(<AnomaliesPage />);

    await chooseOption("Filtrar por tipo", "Problema de calidad de datos");
    await waitFor(() => {
      expect(screen.getByText("1 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    await waitFor(() => {
      expect(screen.getByText("2 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    });
  });

  it("reorders the fetched list with the UI severity sort from the header", async () => {
    mockLoaded([anomalies[1], anomalies[0]]);

    render(<AnomaliesPage />);

    expect(linkNames()).toEqual([
      "M-112-2026-09-10T09:00:00Z",
      "M-112",
      "M-109-2026-09-12T14:00:00Z",
      "M-109",
    ]);

    clickHeader("Severidad");

    await waitFor(() => {
      expect(linkNames()).toEqual([
        "M-109-2026-09-12T14:00:00Z",
        "M-109",
        "M-112-2026-09-10T09:00:00Z",
        "M-112",
      ]);
    });
  });

  it("sorts by detected_at newest first from the header", async () => {
    mockLoaded([anomalies[1], anomalies[0]]);

    render(<AnomaliesPage />);

    clickHeader("Detectada");

    await waitFor(() => {
      expect(linkNames()).toEqual([
        "M-109-2026-09-12T14:00:00Z",
        "M-109",
        "M-112-2026-09-10T09:00:00Z",
        "M-112",
      ]);
    });
    expect(replaceUrl).toHaveBeenCalledWith("/anomalies?sort=detected_at", {
      scroll: false,
    });
  });

  it("sorts by confidence highest first from the header", async () => {
    mockLoaded([anomalies[1], anomalies[0]]);

    render(<AnomaliesPage />);

    clickHeader("Confianza");

    await waitFor(() => {
      expect(linkNames()).toEqual([
        "M-109-2026-09-12T14:00:00Z",
        "M-109",
        "M-112-2026-09-10T09:00:00Z",
        "M-112",
      ]);
    });
    expect(replaceUrl).toHaveBeenCalledWith("/anomalies?sort=confidence", {
      scroll: false,
    });
  });

  it("survives a refresh by restoring the sort order and its arrow from the URL", () => {
    // A refresh re-reads the query string on mount: the array still arrives in
    // the API order, so the deep link has to reproduce the sorted view itself.
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams("sort=detected_at"),
    );
    mockLoaded([anomalies[1], anomalies[0]]);

    render(<AnomaliesPage />);

    expect(linkNames()).toEqual([
      "M-109-2026-09-12T14:00:00Z",
      "M-109",
      "M-112-2026-09-10T09:00:00Z",
      "M-112",
    ]);
    expect(screen.getByRole("columnheader", { name: "Detectada" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    // Restoring a view is read-only: the deep link is not rewritten.
    expect(replaceUrl).not.toHaveBeenCalled();
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
    expect(screen.getByText("2 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
  });

  it("pre-filters by meter_id read from the URL without re-querying", () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("meter_id=M-109"));

    render(<AnomaliesPage />);

    expect(screen.getByText("1 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    expect(linkNames()).toEqual(["M-109-2026-09-12T14:00:00Z", "M-109"]);
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

    expect(screen.getByText("1 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    expect(linkNames()).toEqual(["M-109-2026-09-12T14:00:00Z", "M-109"]);
    // The URL sort is reflected in the header, so a shared link shows the arrow
    // for the order it carries instead of silently defaulting.
    expect(
      screen.getByRole("columnheader", { name: "Severidad" }),
    ).toHaveAttribute("aria-sort", "descending");
    // Restoring the view is a read-only action: the deep link is not rewritten.
    expect(replaceUrl).not.toHaveBeenCalled();
  });

  it("writes a filter change back to the URL with replace and no history entry", async () => {
    render(<AnomaliesPage />);

    await chooseOption("Filtrar por tipo", "Problema de calidad de datos");

    await waitFor(() => {
      expect(replaceUrl).toHaveBeenCalledWith("/anomalies?type=DATA_QUALITY", {
        scroll: false,
      });
    });
    expect(pushUrl).not.toHaveBeenCalled();
    expect(screen.getByText("1 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
  });

  it("writes a deep-linkable sort from a header click and clears it on a second click", async () => {
    // Fed upside down, so "back to the API order" means a different sequence
    // than "whatever the first render happened to show".
    mockLoaded([anomalies[1], anomalies[0]]);
    render(<AnomaliesPage />);

    expect(linkNames()).toEqual([
      "M-112-2026-09-10T09:00:00Z",
      "M-112",
      "M-109-2026-09-12T14:00:00Z",
      "M-109",
    ]);

    clickHeader("Severidad");

    await waitFor(() => {
      expect(replaceUrl).toHaveBeenCalledWith("/anomalies?sort=severity", {
        scroll: false,
      });
    });
    // Severity high-to-low: M-109 is HIGH, M-112 is LOW.
    await waitFor(() => {
      expect(linkNames()).toEqual([
        "M-109-2026-09-12T14:00:00Z",
        "M-109",
        "M-112-2026-09-10T09:00:00Z",
        "M-112",
      ]);
    });

    // The header is now active; clicking it again turns the ordering off back to
    // the untouched API order and must leave no `sort=backend` behind.
    clickHeader("Severidad");

    await waitFor(() => {
      expect(replaceUrl).toHaveBeenLastCalledWith("/anomalies", {
        scroll: false,
      });
    });
    // NOTE: the ROW order is deliberately NOT asserted here. `AnomalyTable`
    // hands the array to antd, whose controlled sorter re-sorts it, so the
    // rendered order comes from antd and a wrong direction in
    // `applyAnomalySort` still renders correctly. Row assertions in this suite
    // therefore cannot fail for that reason -- they would be false confidence.
    // The ordering itself is pinned by the direct unit tests in
    // `anomalyFiltering.test.ts`, which is the only place it can be observed.
  });

  it("removes a cleared filter parameter while keeping the non-default sort", async () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams("type=DATA_QUALITY&sort=priority"),
    );

    render(<AnomaliesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

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
    expect(screen.getByText("2 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    // ...and no header shows an arrow, which is how the untouched API order is
    // represented...
    for (const name of ["Prioridad", "Detectada", "Severidad", "Confianza"]) {
      expect(screen.getByRole("columnheader", { name })).not.toHaveAttribute(
        "aria-sort",
      );
    }
    // ...and an ignored value is not an active filter.
    expect(
      screen.queryByText(/Los filtros se aplican en el navegador/),
    ).not.toBeInTheDocument();
    expect(replaceUrl).not.toHaveBeenCalled();
  });

  const searchBox = () => screen.getByLabelText("Buscar anomalías");
  const clearButton = () =>
    screen.getByRole("button", { name: "Limpiar filtros" });

  it("restores the search from a `?q=` deep link and filters the list", () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("q=m-112"));

    render(<AnomaliesPage />);

    expect(searchBox()).toHaveValue("m-112");
    expect(screen.getByText("1 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    expect(linkNames()).toEqual(["M-112-2026-09-10T09:00:00Z", "M-112"]);
  });

  it("matches a case-insensitive substring typed into the box", async () => {
    render(<AnomaliesPage />);

    fireEvent.change(searchBox(), { target: { value: "spike" } });

    // "spike" appears only in the first anomaly's free text, not in any id.
    await waitFor(() => {
      expect(screen.getByText("1 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    });
    expect(linkNames()).toEqual(["M-109-2026-09-12T14:00:00Z", "M-109"]);
  });

  it("shows the filter empty state, not the backend empty state, when the search matches nothing", async () => {
    render(<AnomaliesPage />);

    fireEvent.change(searchBox(), { target: { value: "zzzzz" } });

    await waitFor(() => {
      expect(
        screen.getByText("Ninguna anomalía coincide con los filtros actuales."),
      ).toBeInTheDocument();
    });
    // The backend did report two anomalies; the search hid them.
    expect(
      screen.queryByText("El backend no reportó anomalías."),
    ).not.toBeInTheDocument();
  });

  // Regression for the recorded open finding: the filter bar and the empty state
  // used to render buttons with the same accessible name, so
  // `getByRole("button", { name: ... })` THREW once the empty state
  // was visible. The two actions now have distinct Spanish names --
  // "Limpiar filtros" for the filter bar and "Quitar filtros" for the empty
  // state -- and this test proves both can coexist and be addressed
  // unambiguously.
  it("addresses the filter-bar and empty-state clear actions by distinct names", async () => {
    render(<AnomaliesPage />);

    fireEvent.change(searchBox(), { target: { value: "zzzzz" } });

    await waitFor(() => {
      expect(
        screen.getByText("Ninguna anomalía coincide con los filtros actuales."),
      ).toBeInTheDocument();
    });

    // Both controls are on screen at once, and each name resolves to exactly
    // one button instead of throwing on an ambiguous match.
    expect(clearButton()).toBeEnabled();
    const emptyStateClear = screen.getByRole("button", {
      name: "Quitar filtros",
    });

    // The empty-state action restores the unfiltered list.
    fireEvent.click(emptyStateClear);

    await waitFor(() => {
      expect(screen.getByText("2 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    });
  });

  // Regression, and the reason this feature was reverted once. The button used
  // to be gated only on the COMMITTED filters, so while a typed term was still
  // inside the debounce the committed filters were all empty and "Clear filters"
  // rendered DISABLED: the user could not clear what they had just typed, and
  // the term reached the URL moments later. Found by driving a real browser,
  // which is what surfaced the `disabled` attribute; the jsdom probes had been
  // reasoning about the state machine instead. Reverting this gate makes BOTH
  // this test and the one below fail.
  it("enables the clear action while a typed term is still inside the debounce", () => {
    render(<AnomaliesPage />);

    expect(clearButton()).toBeDisabled();

    fireEvent.change(searchBox(), { target: { value: "zzz" } });

    expect(clearButton()).toBeEnabled();
  });

  it("enables the clear action for a whitespace-only entry the box is showing", () => {
    render(<AnomaliesPage />);

    fireEvent.change(searchBox(), { target: { value: "   " } });

    // The box visibly holds something, so the action that empties it must be
    // available even though whitespace never commits as a filter.
    expect(searchBox()).toHaveValue("   ");
    expect(clearButton()).toBeEnabled();
  });

  it("clears a pending draft and does not resurrect the term once the debounce settles", async () => {
    render(<AnomaliesPage />);

    fireEvent.change(searchBox(), { target: { value: "zzz" } });
    // Deliberately no waitFor: the draft is still pending in the debounce.
    fireEvent.click(clearButton());

    await waitFor(() => {
      expect(searchBox()).toHaveValue("");
    });

    // And the term must not come back after the debounce window elapses.
    await waitFor(() => {
      expect(screen.getByText("2 de 2 anomalías coinciden con los filtros.")).toBeInTheDocument();
    });
    expect(searchBox()).toHaveValue("");
    expect(replaceUrl).not.toHaveBeenCalledWith(
      expect.stringContaining("q=zzz"),
      expect.anything(),
    );
  });

  it("paginates the anomaly list ten rows at a time", () => {
    mockLoaded(manyAnomalies(25));
    const { container } = render(<AnomaliesPage />);

    expect(anomalyRowIds()).toEqual(rowIdsFrom(1, 10));

    fireEvent.click(paginatorOf(container).getByTitle("2"));

    expect(anomalyRowIds()).toEqual(rowIdsFrom(11, 20));
    // Moving between pages is not a filter or sort change, so the URL is left
    // exactly as it was.
    expect(replaceUrl).not.toHaveBeenCalled();
  });

  it("keeps the filter and the sort while moving between pages", () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams("type=REAL_ANOMALY&sort=priority"),
    );
    mockLoaded(manyAnomalies(25));
    const { container } = render(<AnomaliesPage />);

    // 24 of the 25 rows match the type filter; the last one is DATA_QUALITY.
    expect(
      screen.getByText("24 de 25 anomalías coinciden con los filtros."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Prioridad" }),
    ).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(paginatorOf(container).getByTitle("2"));

    expect(anomalyRowIds()).toEqual(rowIdsFrom(11, 20));
    // The filter still counts 24 matches and the header still shows the sort:
    // paging did not drop either.
    expect(
      screen.getByText("24 de 25 anomalías coinciden con los filtros."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Prioridad" }),
    ).toHaveAttribute("aria-sort", "ascending");
    expect(replaceUrl).not.toHaveBeenCalled();
  });

  it("does not strand the user on a page a filter removes", async () => {
    mockLoaded(manyAnomalies(25));
    const { container } = render(<AnomaliesPage />);

    fireEvent.click(paginatorOf(container).getByTitle("3"));
    expect(anomalyRowIds()).toEqual(rowIdsFrom(21, 25));

    await chooseOption("Filtrar por tipo", "Problema de calidad de datos");

    await waitFor(() => {
      expect(
        screen.getByText("1 de 25 anomalías coinciden con los filtros."),
      ).toBeInTheDocument();
    });
    // Page 3 no longer exists, so the single matching row must be on screen and
    // the paginator back on page 1 instead of an empty page.
    expect(anomalyRowIds()).toEqual(["A-025"]);
    expect(paginatorOf(container).getByTitle("1")).toHaveClass(
      "ant-pagination-item-active",
    );
  });

  it("states the filter match count without claiming every match is visible", () => {
    mockLoaded(manyAnomalies(25));
    render(<AnomaliesPage />);

    // The status line reports how many rows MATCH the filters, which is 25 here,
    // while the paginated table shows only one page of them. The wording never
    // says those 25 rows are all on screen -- antd's paginator, not this line,
    // conveys the page window -- so the two cannot be read as contradictory.
    expect(
      screen.getByText("25 de 25 anomalías coinciden con los filtros."),
    ).toBeInTheDocument();
    expect(anomalyRowIds()).toHaveLength(10);
    expect(
      screen.queryByText(/Mostrando \d+ de \d+ anomal/),
    ).not.toBeInTheDocument();
  });

  it("shows every row and one page when the result set fits exactly one page", () => {
    mockLoaded(manyAnomalies(10));
    const { container } = render(<AnomaliesPage />);

    expect(anomalyRowIds()).toEqual(rowIdsFrom(1, 10));
    expect(
      screen.getByText("10 de 10 anomalías coinciden con los filtros."),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".ant-pagination-item")).toHaveLength(1);
    expect(paginatorOf(container).getByTitle("1")).toHaveClass(
      "ant-pagination-item-active",
    );
  });

  // `AnomalyFilters` gained two effects this phase (the debounced publish and
  // the external-term adoption) plus render-phase state adjustment, and the
  // project rule is that every effect-bearing component renders inside
  // StrictMode at least once. That coverage was lost while T3 and T4 rewrote
  // this suite, so it is restored here.
  it("keeps a restored search stable under StrictMode's double-invoked effects", () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("q=spike"));

    render(
      <StrictMode>
        <AnomaliesPage />
      </StrictMode>,
    );

    expect(searchBox()).toHaveValue("spike");
    expect(
      screen.getByText("1 de 2 anomalías coinciden con los filtros."),
    ).toBeInTheDocument();
    // StrictMode re-runs effects; a mount must not emit a URL write.
    expect(replaceUrl).not.toHaveBeenCalled();
  });

  it("types and clears under StrictMode's double-invoked effects", async () => {
    render(
      <StrictMode>
        <AnomaliesPage />
      </StrictMode>,
    );

    fireEvent.change(searchBox(), { target: { value: "spike" } });
    await waitFor(() => {
      expect(
        screen.getByText("1 de 2 anomalías coinciden con los filtros."),
      ).toBeInTheDocument();
    });

    fireEvent.click(clearButton());
    await waitFor(() => {
      expect(searchBox()).toHaveValue("");
      expect(
        screen.getByText("2 de 2 anomalías coinciden con los filtros."),
      ).toBeInTheDocument();
    });
  });

  // SHAPE PROXY, not an alignment check. jsdom loads no stylesheets, so the real
  // 144 px content edge (E2) is unobservable here; what this pins is the shape
  // the fix introduced: the page wrapper owns the VERTICAL padding only and adds
  // no horizontal padding that would double the shell gutter. Restoring
  // `padding: "1rem"` on the wrapper makes this fail.
  it("leaves the horizontal gutter to the shell and keeps only vertical padding", () => {
    render(<AnomaliesPage />);

    const wrapper = screen.getByRole("heading", { level: 1 }).parentElement;
    expect(wrapper?.style.paddingBlock).toBe("1rem");
    expect(wrapper?.style.padding).toBe("");
    expect(wrapper?.style.paddingLeft).toBe("");
    expect(wrapper?.style.paddingRight).toBe("");
    expect(wrapper?.style.paddingInline).toBe("");
  });
});

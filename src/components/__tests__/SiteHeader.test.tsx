import React from "react";
import { cleanup, render, screen } from "@testing-library/react";

const mockUsePathname = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock("@/features/api/apiSlice", () => ({
  useGetDashboardSummaryQuery: jest.fn(),
}));

import { useGetDashboardSummaryQuery } from "@/features/api/apiSlice";
import { ThemeProvider } from "../../theme/theme-provider";
import { SiteHeader } from "../shell/SiteHeader";

const mockedSummary = useGetDashboardSummaryQuery as jest.Mock;

function renderHeader(): void {
  render(
    <ThemeProvider>
      <SiteHeader />
    </ThemeProvider>,
  );
}

describe("SiteHeader anomaly badge", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/meters");
    mockedSummary.mockReset();
  });

  it("renders the count on the Anomalías item when it is positive", () => {
    mockedSummary.mockReturnValue({
      data: { health: "ok", meters: 2, anomalies: 3, lastRun: "latest" },
      isLoading: false,
      error: undefined,
    });

    renderHeader();

    expect(screen.getByText("3")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Anomalías" });
    expect(link).toHaveAttribute(
      "aria-describedby",
      "anomalies-badge-description",
    );
    expect(screen.getByText("3 anomalías")).toBeInTheDocument();
  });

  it("renders no badge when the count is zero", () => {
    mockedSummary.mockReturnValue({
      data: { health: "ok", meters: 2, anomalies: 0, lastRun: "latest" },
      isLoading: false,
      error: undefined,
    });

    renderHeader();

    const link = screen.getByRole("link", { name: "Anomalías" });
    // antd's Badge hides `count={0}` but still renders its wrapper, so assert
    // on the wrapper itself instead of the never-visible "0" text: doing so is
    // what actually distinguishes `> 0` from `>= 0`.
    expect(link.querySelector(".ant-badge")).toBeNull();
    expect(link).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText(/anomalías$/)).toBeNull();
  });

  it("renders no badge and no description while the summary is undefined", () => {
    mockedSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });

    renderHeader();

    expect(screen.queryByText(/anomalías$/)).toBeNull();
    expect(screen.getByRole("link", { name: "Anomalías" })).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  it("renders no badge while the summary is loading", () => {
    mockedSummary.mockReturnValue({
      data: { anomalies: 3 },
      isLoading: true,
      error: undefined,
    });

    renderHeader();

    // RTK Query keeps the last successful `data` during a refetch, so a stale
    // positive count must still be suppressed while `isLoading` is true.
    const link = screen.getByRole("link", { name: "Anomalías" });
    expect(link.querySelector(".ant-badge")).toBeNull();
    expect(link).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("3 anomalías")).toBeNull();
  });

  it("surfaces no error in the shell when the summary query fails", () => {
    mockedSummary.mockReturnValue({
      data: { anomalies: 3 },
      isLoading: false,
      error: { message: "summary exploded" },
    });

    renderHeader();

    // A failed refetch also keeps the previous `data`, which must not surface.
    const link = screen.getByRole("link", { name: "Anomalías" });
    expect(link.querySelector(".ant-badge")).toBeNull();
    expect(link).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("3 anomalías")).toBeNull();
    expect(screen.queryByText("summary exploded")).toBeNull();
  });
});

describe("SiteHeader current destination", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockedSummary.mockReset();
    mockedSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
  });

  it("marks only the active destination with aria-current", () => {
    mockUsePathname.mockReturnValue("/anomalies");
    renderHeader();

    expect(
      screen.getByRole("link", { name: "Anomalías" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Medidores" }),
    ).not.toHaveAttribute("aria-current");

    cleanup();

    mockUsePathname.mockReturnValue("/meters");
    renderHeader();

    expect(
      screen.getByRole("link", { name: "Medidores" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Anomalías" }),
    ).not.toHaveAttribute("aria-current");
  });
});

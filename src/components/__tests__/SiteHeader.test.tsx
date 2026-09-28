import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockUsePathname = jest.fn();
const mockReplace = jest.fn();
const mockUseRouter = jest.fn(() => ({ replace: mockReplace }));

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => mockUseRouter(),
}));

jest.mock("@/features/api/apiSlice", () => ({
  useGetDashboardSummaryQuery: jest.fn(),
}));

import { useGetDashboardSummaryQuery } from "@/features/api/apiSlice";
import { SESSION_STORAGE_KEY } from "@/features/auth/session";
import { ThemeProvider } from "../../theme/theme-provider";
import { SiteHeader } from "../shell/SiteHeader";

const mockedSummary = useGetDashboardSummaryQuery as jest.Mock;

/** A structurally valid (never verified) HS256-shaped token for the tests. */
function makeToken(payload: Record<string, unknown>): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
}

function renderHeader(): void {
  render(
    <ThemeProvider>
      <SiteHeader />
    </ThemeProvider>,
  );
}

describe("SiteHeader anomaly badge", () => {
  beforeEach(() => {
    window.localStorage.clear();
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

describe("SiteHeader session", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUsePathname.mockReset();
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseRouter.mockReset();
    mockUseRouter.mockReturnValue({ replace: mockReplace });
    mockReplace.mockReset();
    mockedSummary.mockReset();
    mockedSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
  });

  it("shows the signed-in user and clears the session on logout", async () => {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      makeToken({
        sub: "jcamilo",
        name: "Juan Camilo",
        authorized: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );

    renderHeader();

    expect(await screen.findByText("Juan Camilo")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});

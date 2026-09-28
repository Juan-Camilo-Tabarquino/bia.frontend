import React from "react";
import { render, screen } from "@testing-library/react";

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

// `BackendStatus` mounts inside the shell and issues one `GET /health` through
// axios. This suite is about the guard, not about the network, so the one-shot
// call is stubbed with a promise that never settles: it renders no markup, and a
// resolved stub would fire a toast from a timer and report a state update
// outside `act`.
jest.mock("@/api/backend", () => ({
  getHealth: jest.fn(() => new Promise(() => {})),
}));

import { App } from "antd";
import { useGetDashboardSummaryQuery } from "@/features/api/apiSlice";
import { SESSION_STORAGE_KEY } from "@/features/auth/session";
import { ThemeProvider } from "../../theme/theme-provider";
import { SiteShell } from "../shell/SiteShell";

const mockedSummary = useGetDashboardSummaryQuery as jest.Mock;

/**
 * The one string that only the guarded subtree can render. It is deliberately
 * NOT the header or the footer: the shell's chrome renders on every route the
 * guard covers, so using chrome as the probe would pass even with the guard
 * deleted.
 */
const GUARDED_TEXT = "contenido protegido";

/** A structurally valid (never verified) HS256-shaped token for the tests. */
function makeToken(payload: Record<string, unknown>): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
}

function renderShell(): void {
  render(
    <ThemeProvider>
      {/* The real provider chain wraps the shell in antd's `App`, which is what
          gives `BackendStatus` a `notification` API to call. Without it the
          health toast would throw on the context's empty default. */}
      <App>
        <SiteShell>
          <span>{GUARDED_TEXT}</span>
        </SiteShell>
      </App>
    </ThemeProvider>,
  );
}

describe("SiteShell route guard", () => {
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

  // This is the assertion the auth work asked for: delete `<PrivateRoute>` from
  // `SiteShell` and this test fails, because the guarded subtree renders with no
  // session. Before it, every suite rendered pages directly and never mounted
  // the shell, so removing the only guard in the app kept the whole suite green.
  it("hides the guarded content and redirects to /login when there is no session", () => {
    renderShell();

    // The shell itself mounted -- otherwise the assertion below would be vacuous.
    expect(
      screen.getByRole("link", { name: "Anomalías" }),
    ).toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText(GUARDED_TEXT)).toBeNull();
  });

  it("renders the guarded content when a valid session exists", () => {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      makeToken({
        sub: "jcamilo",
        name: "Juan Camilo",
        authorized: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );

    renderShell();

    expect(screen.getByText(GUARDED_TEXT)).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

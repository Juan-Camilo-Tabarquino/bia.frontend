import React from "react";
import { render, screen } from "@testing-library/react";

const mockUsePathname = jest.fn();
const mockReplace = jest.fn();
const mockUseRouter = jest.fn(() => ({ replace: mockReplace }));

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => mockUseRouter(),
}));

import { SESSION_STORAGE_KEY } from "@/features/auth/session";
import PrivateRoute from "../PrivateRoute";

/** A structurally valid (never verified) HS256-shaped token for the tests. */
function makeToken(payload: Record<string, unknown>): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
}

function validToken(): string {
  return makeToken({
    sub: "jcamilo",
    name: "Juan Camilo",
    authorized: true,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

describe("PrivateRoute", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUsePathname.mockReset();
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseRouter.mockReset();
    mockUseRouter.mockReturnValue({ replace: mockReplace });
    mockReplace.mockReset();
  });

  it("renders children when a valid session exists", () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, validToken());

    render(
      <PrivateRoute>
        <span>contenido protegido</span>
      </PrivateRoute>,
    );

    expect(screen.getByText("contenido protegido")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to /login and renders nothing when there is no session", () => {
    render(
      <PrivateRoute>
        <span>contenido protegido</span>
      </PrivateRoute>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("contenido protegido")).toBeNull();
  });

  // The guard is mounted in the shell, which also wraps `/login`; skipping that
  // route is what makes a redirect loop impossible.
  it("never redirects on /login", () => {
    mockUsePathname.mockReturnValue("/login");

    render(
      <PrivateRoute>
        <span>contenido de login</span>
      </PrivateRoute>,
    );

    expect(screen.getByText("contenido de login")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

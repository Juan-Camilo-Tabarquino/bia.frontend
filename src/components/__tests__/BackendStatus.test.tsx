import React, { StrictMode } from "react";
import { render, waitFor } from "@testing-library/react";
import { App as AntdApp } from "antd";

jest.mock("../../api/backend", () => ({
  getHealth: jest.fn(),
}));

import { getHealth } from "../../api/backend";
import { BackendStatus } from "../BackendStatus";

const mockedGetHealth = getHealth as jest.Mock;

const success = jest.fn();
const error = jest.fn();

/**
 * Replace the antd App context with spies so the assertion is deterministic:
 * the test observes the exact number of notification calls instead of racing
 * rc-motion while notices mount. The real `App` provider is already wired in
 * `src/app/providers.tsx`; this only swaps the instance for the test.
 */
function spyOnNotification(): void {
  jest.spyOn(AntdApp, "useApp").mockReturnValue({
    notification: {
      success,
      error,
      info: jest.fn(),
      warning: jest.fn(),
      open: jest.fn(),
      destroy: jest.fn(),
    },
    message: {},
    modal: {},
  } as unknown as ReturnType<typeof AntdApp.useApp>);
}

beforeEach(() => {
  mockedGetHealth.mockReset();
  success.mockReset();
  error.mockReset();
  spyOnNotification();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// React StrictMode is on in `next dev`, so the startup toast is verified under
// it here. Without it a double-invoked effect would ship a green suite and two
// notifications in the browser.
describe("BackendStatus", () => {
  it("reports success exactly once under StrictMode's double-invoked effect", async () => {
    mockedGetHealth.mockResolvedValue({ status: 200 });

    render(
      <StrictMode>
        <BackendStatus />
      </StrictMode>,
    );

    await waitFor(() => expect(success).toHaveBeenCalledTimes(1));

    // The failure this test must catch: a second StrictMode setup firing a
    // second toast. Exactly one call and one toast are required.
    expect(mockedGetHealth).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    expect(success.mock.calls[0][0]).toMatchObject({
      title: "Conexión establecida",
    });
  });

  it("reports failure exactly once with a Spanish data-unavailable warning", async () => {
    mockedGetHealth.mockRejectedValue(new Error("backend down"));

    render(
      <StrictMode>
        <BackendStatus />
      </StrictMode>,
    );

    await waitFor(() => expect(error).toHaveBeenCalledTimes(1));

    expect(mockedGetHealth).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    const [config] = error.mock.calls[0] as [{ description: string }];
    expect(config.description).toContain("pueden no estar disponibles");
  });

  it("renders no visible markup", () => {
    mockedGetHealth.mockResolvedValue({ status: 200 });

    const { container } = render(<BackendStatus />);

    expect(container).toBeEmptyDOMElement();
  });
});

import React, { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ThemeProvider, useThemeMode } from "../../theme/theme-provider";
import { CSS_VAR_SCOPE_CLASS } from "../../theme/tokens";

/**
 * The theme layer is the one piece the static build cannot prove: `next build`
 * only emits our `var(--bia-*)` references, while antd's cssVar mode defines
 * the variables at runtime. These assertions exercise that runtime path, so the
 * light/dark toggle is verified rather than assumed.
 */
function ModeProbe() {
  const { mode, toggle } = useThemeMode();
  return (
    <button type="button" onClick={toggle}>
      {mode}
    </button>
  );
}

// React StrictMode is on in `next dev`, so the suite renders under it too.
// Otherwise a StrictMode-only remount bug ships green, as it did once here.
function renderStrict(ui: React.ReactElement) {
  return render(<StrictMode>{ui}</StrictMode>);
}

function injectedCss(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((style) => style.textContent ?? "")
    .join("\n");
}

/** Every bia-prefixed variable the SCSS modules and TSX inline styles read. */
const REQUIRED_VARIABLES = [
  "--bia-color-primary",
  "--bia-color-bg-base",
  "--bia-color-bg-container",
  "--bia-color-text",
  "--bia-color-text-secondary",
  "--bia-color-border-secondary",
  "--bia-color-fill-alter",
  "--bia-color-fill-content",
  "--bia-color-error",
  "--bia-color-error-bg",
  "--bia-border-radius",
];

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to dark and reflects it on the document element", async () => {
    renderStrict(
      <ThemeProvider>
        <ModeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(screen.getByRole("button", { name: "dark" })).toBeInTheDocument();
  });

  it("toggles to light and persists the choice under bia-theme", async () => {
    renderStrict(
      <ThemeProvider>
        <ModeProbe />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "dark" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });
    expect(window.localStorage.getItem("bia-theme")).toBe("light");
  });

  it("adopts a stored preference after mount", async () => {
    window.localStorage.setItem("bia-theme", "light");

    renderStrict(
      <ThemeProvider>
        <ModeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "light" })).toBeInTheDocument();
    });
  });

  it("keeps the stored preference through StrictMode's double-invoked effects", async () => {
    window.localStorage.setItem("bia-theme", "light");

    renderStrict(
      <ThemeProvider>
        <ModeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });
    expect(screen.getByRole("button", { name: "light" })).toBeInTheDocument();
    // The regression: the mount commit's default "dark" must never overwrite
    // the preference the read effect just applied. StrictMode remounts effects
    // immediately, so a persist-on-change effect writes the stale default and
    // the remount then reads its own clobbered value.
    expect(window.localStorage.getItem("bia-theme")).toBe("light");
  });

  it("falls back to dark when reading storage throws", async () => {
    const getItem = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("storage blocked");
      });

    try {
      renderStrict(
        <ThemeProvider>
          <ModeProbe />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe("dark");
      });
      expect(screen.getByRole("button", { name: "dark" })).toBeInTheDocument();
    } finally {
      getItem.mockRestore();
    }
  });

  it("keeps toggling when writing storage throws", async () => {
    const setItem = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });

    try {
      renderStrict(
        <ThemeProvider>
          <ModeProbe />
        </ThemeProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "dark" }));

      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe("light");
      });
      expect(screen.getByRole("button", { name: "light" })).toBeInTheDocument();
    } finally {
      setItem.mockRestore();
    }
  });

  it("defines every bia-prefixed CSS variable the app references", async () => {
    renderStrict(
      <ThemeProvider>
        <ModeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      const css = injectedCss();
      for (const name of REQUIRED_VARIABLES) {
        // The `:` proves a definition, not merely a `var()` reference.
        expect(css).toContain(`${name}:`);
      }
      // The definitions must land on the class the root layout puts on <html>,
      // otherwise `body` (an ancestor of the shell) cannot read them.
      expect(css).toMatch(new RegExp(`\\.${CSS_VAR_SCOPE_CLASS}\\s*\\{`));
    });
  });

  it("throws a clear error when used outside the provider", () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderStrict(<ModeProbe />)).toThrow(/ThemeProvider/);

    consoleError.mockRestore();
  });
});

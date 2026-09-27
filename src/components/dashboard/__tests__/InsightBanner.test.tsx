import React from "react";
import { render, screen, within } from "@testing-library/react";
import { InsightBanner } from "../InsightBanner";

describe("InsightBanner", () => {
  it("states the summary total and the derived HIGH-severity count", () => {
    render(<InsightBanner total={2} highSeverity={1} />);

    const banner = screen.getByText(/Hay 2 anomalías/);

    // Exact text: the banner must add no number the DTO does not carry.
    expect(banner).toHaveTextContent(
      "Hay 2 anomalías en la última ejecución, 1 de severidad alta.",
    );
    // The actionable count is the highlighted one.
    expect(within(banner).getByText("1")).toHaveClass("number");
    expect(banner.querySelectorAll(".number")).toHaveLength(1);
  });

  it("reports zero high-severity rows rather than hiding the fact", () => {
    render(<InsightBanner total={5} highSeverity={0} />);

    expect(screen.getByText(/Hay 5 anomalías/)).toHaveTextContent(
      "Hay 5 anomalías en la última ejecución, 0 de severidad alta.",
    );
  });

  it("states the honest empty result when the summary reports no anomalies", () => {
    const { container } = render(<InsightBanner total={0} highSeverity={0} />);

    expect(
      screen.getByText("No se detectaron anomalías en la última ejecución."),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".number")).toHaveLength(0);
  });

  it("renders nothing numeric for an absent or malformed total", () => {
    const { container, rerender } = render(<InsightBanner total={undefined} />);

    expect(
      screen.getByText("Todavía no hay datos de anomalías para resumir."),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined/);

    rerender(<InsightBanner total={Number.NaN} highSeverity={1} />);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it("drops the severity clause when the count is missing, instead of claiming zero", () => {
    const { container } = render(
      <InsightBanner total={3} highSeverity={undefined} />,
    );

    expect(screen.getByText(/Hay 3 anomalías/)).toHaveTextContent(
      "Hay 3 anomalías en la última ejecución.",
    );
    expect(container.textContent).not.toMatch(/NaN|undefined/);
    expect(container.querySelectorAll(".number")).toHaveLength(0);
  });
});

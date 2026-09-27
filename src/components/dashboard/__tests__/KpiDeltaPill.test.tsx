import React from "react";
import { render, screen } from "@testing-library/react";
import { KpiDeltaPill } from "../KpiDeltaPill";

/** The pill is a single element per direction, so querying by direction is safe. */
function pillFor(container: HTMLElement, direction: string): HTMLElement {
  const pill = container.querySelector<HTMLElement>(
    `[data-direction="${direction}"]`,
  );
  if (!pill) {
    throw new Error(`No delta pill with direction "${direction}"`);
  }
  return pill;
}

describe("KpiDeltaPill", () => {
  it("renders a positive change as an up arrow in the error colour", () => {
    const { container } = render(<KpiDeltaPill changePct={12.5} />);

    expect(screen.getByText("+12.5%")).toBeInTheDocument();
    expect(screen.getByText("↑")).toBeInTheDocument();

    const pill = pillFor(container, "up");
    expect(pill).toHaveClass("up");
    expect(pill).toHaveTextContent("+12.5%");
  });

  it("renders a negative change as a down arrow in the success colour, sign intact", () => {
    const { container } = render(<KpiDeltaPill changePct={-18.1} />);

    expect(screen.getByText("-18.1%")).toBeInTheDocument();
    expect(screen.getByText("↓")).toBeInTheDocument();
    // The sign is the DTO's own: a negative value must never read as positive.
    expect(screen.queryByText("18.1%")).not.toBeInTheDocument();

    expect(pillFor(container, "down")).toHaveClass("down");
  });

  it("renders exactly zero flat, without fabricating a direction", () => {
    const { container } = render(<KpiDeltaPill changePct={0} />);

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.queryByText("↑")).not.toBeInTheDocument();
    expect(screen.queryByText("↓")).not.toBeInTheDocument();

    expect(pillFor(container, "flat")).toHaveClass("flat");
  });

  it("renders nothing for an absent or malformed value, never NaN or undefined", () => {
    const { container, rerender } = render(
      <KpiDeltaPill changePct={undefined} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<KpiDeltaPill changePct={Number.NaN} />);
    expect(container).toBeEmptyDOMElement();
    expect(container.textContent).not.toMatch(/NaN|undefined/);

    rerender(<KpiDeltaPill changePct={Number.POSITIVE_INFINITY} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the direction for assistive tech, because colour alone does not", () => {
    render(<KpiDeltaPill changePct={-4} />);

    expect(screen.getByText("descenso")).toBeInTheDocument();
  });
});

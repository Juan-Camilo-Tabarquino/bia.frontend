import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { RequestError } from "../RequestError";

/**
 * `RequestError` holds no effects, so it needs no StrictMode wrapper: the
 * contract here is the rendered alert and the retry action.
 */
describe("RequestError", () => {
  it("renders the title and the description inside an alert", () => {
    render(
      <RequestError
        title="No se pudieron cargar los medidores"
        description="Fallo de red"
        onRetry={jest.fn()}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudieron cargar los medidores");
    expect(alert).toHaveTextContent("Fallo de red");
  });

  it("falls back to a Spanish default title", () => {
    render(<RequestError onRetry={jest.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudieron cargar los datos",
    );
  });

  it("invokes onRetry when the Reintentar action is clicked", () => {
    const onRetry = jest.fn();
    render(<RequestError title="Fallo" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables the retry action while a retry is in flight", () => {
    render(<RequestError title="Fallo" onRetry={jest.fn()} retrying />);

    expect(screen.getByRole("button", { name: /Reintentar/ })).toBeDisabled();
  });

  it("keeps the retry action enabled when not retrying", () => {
    render(<RequestError title="Fallo" onRetry={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: /Reintentar/ }),
    ).not.toBeDisabled();
  });
});

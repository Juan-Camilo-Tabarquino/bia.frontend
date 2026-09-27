import React from "react";
import { render, screen, within } from "@testing-library/react";

const mockUsePathname = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { SiteBreadcrumb } from "../shell/SiteBreadcrumb";

/** The trail nav carries a Spanish label so it is reachable by screen readers. */
function trail() {
  return screen.getByRole("navigation", { name: "Ruta de navegación" });
}

describe("SiteBreadcrumb", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  it("renders Bia -> Medidores for /meters, with Medidores as the current item", () => {
    mockUsePathname.mockReturnValue("/meters");
    render(<SiteBreadcrumb />);

    expect(
      within(trail()).getByRole("link", { name: "Bia" }),
    ).toHaveAttribute("href", "/meters");

    const current = within(trail()).getByText("Medidores");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders Bia -> Medidores -> M-109 for /meter/M-109, with the meter id verbatim", () => {
    mockUsePathname.mockReturnValue("/meter/M-109");
    render(<SiteBreadcrumb />);

    expect(
      within(trail()).getByRole("link", { name: "Bia" }),
    ).toHaveAttribute("href", "/meters");
    expect(
      within(trail()).getByRole("link", { name: "Medidores" }),
    ).toHaveAttribute("href", "/meters");

    const current = within(trail()).getByText("M-109");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders the full readings trail with the meter id linked and Lecturas current", () => {
    mockUsePathname.mockReturnValue("/meter/M-109/readings");
    render(<SiteBreadcrumb />);

    expect(
      within(trail()).getByRole("link", { name: "M-109" }),
    ).toHaveAttribute("href", "/meter/M-109");

    const current = within(trail()).getByText("Lecturas");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders Bia -> Análisis for /dashboard", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<SiteBreadcrumb />);

    expect(
      within(trail()).getByRole("link", { name: "Bia" }),
    ).toHaveAttribute("href", "/meters");

    const current = within(trail()).getByText("Análisis");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders Bia -> Anomalías for /anomalies", () => {
    mockUsePathname.mockReturnValue("/anomalies");
    render(<SiteBreadcrumb />);

    const current = within(trail()).getByText("Anomalías");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders Bia -> Anomalías -> <id> for an anomaly detail, with the id verbatim", () => {
    mockUsePathname.mockReturnValue("/anomalies/anomaly-42");
    render(<SiteBreadcrumb />);

    expect(
      within(trail()).getByRole("link", { name: "Anomalías" }),
    ).toHaveAttribute("href", "/anomalies");

    const current = within(trail()).getByText("anomaly-42");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  // `usePathname` returns the ENCODED pathname, so a meter addressed with an
  // encoded segment (a hand-crafted or externally produced link) rendered the
  // literal `M%20109%2FA` as its label in a real browser. The label must show
  // the id the API uses while the href must stay encoded, or the link breaks.
  it("decodes an encoded meter id for the label and keeps the link encoded", () => {
    mockUsePathname.mockReturnValue("/meter/M%20109%2FA/readings");
    render(<SiteBreadcrumb />);

    expect(
      within(trail()).getByRole("link", { name: "M 109/A" }),
    ).toHaveAttribute("href", "/meter/M%20109%2FA");
  });

  it("decodes an encoded meter id in the current item of /meter/<id>", () => {
    mockUsePathname.mockReturnValue("/meter/M%20109%2FA");
    render(<SiteBreadcrumb />);

    const current = within(trail()).getByText("M 109/A");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveAttribute("aria-current", "page");
    // The verbatim encoded form must no longer be rendered anywhere.
    expect(within(trail()).queryByText("M%20109%2FA")).toBeNull();
  });

  it("decodes an encoded anomaly id in the current item of /anomalies/<id>", () => {
    mockUsePathname.mockReturnValue("/anomalies/anomaly%2F42");
    render(<SiteBreadcrumb />);

    const current = within(trail()).getByText("anomaly/42");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  // `decodeURIComponent` throws `URIError` on a malformed percent escape, so
  // without a guard the breadcrumb would crash on `/meter/%ZZ`. The fallback is
  // to keep the segment exactly as the route received it: no blank label, no
  // crash, and no invented link target.
  it("renders a malformed percent escape verbatim instead of throwing", () => {
    mockUsePathname.mockReturnValue("/meter/%ZZ");
    render(<SiteBreadcrumb />);

    const current = within(trail()).getByText("%ZZ");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("keeps the trail intact for a malformed escape in a readings link", () => {
    mockUsePathname.mockReturnValue("/meter/%ZZ/readings");
    render(<SiteBreadcrumb />);

    expect(within(trail()).getByRole("link", { name: "%ZZ" })).toHaveAttribute(
      "href",
      "/meter/%ZZ",
    );
    expect(within(trail()).getByText("Lecturas")).toBeInTheDocument();
  });

  // Regression guard for the reported bug (E1). antd's component reset
  // `:where(...).ant-breadcrumb { margin: 0; padding: 0 }` ties the shared
  // `.shell-container` class on specificity -- `:where()` contributes zero --
  // and wins on source order, so a `shell-container` on antd's own `<nav>`
  // loses its gutter and `margin-inline: auto`. The fix moves the class to a
  // plain WRAPPER around the breadcrumb, which cannot tie. Putting the class
  // back on the `<nav>` makes both assertions below fail.
  it("keeps the shared gutter on a wrapper element, never on antd's nav", () => {
    mockUsePathname.mockReturnValue("/meters");
    render(<SiteBreadcrumb />);

    const nav = trail();
    const wrapper = nav.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass("shell-container");
    expect(nav).not.toHaveClass("shell-container");
  });

  // Regression guard for the dead-margin bug. `styles.wrapper` declares
  // `margin-top: 1rem`, and on antd's own `<nav>` the SAME zero-specificity
  // reset above ties it and wins on source order, so the declaration was
  // dropped and the trail sat flush against the header. On the plain wrapper
  // the declaration cannot tie. The module class reads as the plain name
  // `wrapper` at test time (CSS modules are mapped to `identity-obj-proxy`),
  // so the class token itself is asserted. Moving the class back onto the
  // `<nav>` makes both assertions below fail.
  it("keeps the top separation on the wrapper, never on antd's nav", () => {
    mockUsePathname.mockReturnValue("/meters");
    render(<SiteBreadcrumb />);

    const nav = trail();
    const wrapper = nav.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass("wrapper");
    expect(nav).not.toHaveClass("wrapper");
  });

  it("renders no breadcrumb for an unknown path", () => {
    mockUsePathname.mockReturnValue("/not-a-route");
    const { container } = render(<SiteBreadcrumb />);

    expect(
      screen.queryByRole("navigation", { name: "Ruta de navegación" }),
    ).toBeNull();
    // The wrappers must not survive as an empty, padded element either.
    expect(container).toBeEmptyDOMElement();
  });

  it("renders no breadcrumb for a malformed meter route", () => {
    mockUsePathname.mockReturnValue("/meter/M-109/not-readings");
    render(<SiteBreadcrumb />);

    expect(
      screen.queryByRole("navigation", { name: "Ruta de navegación" }),
    ).toBeNull();
  });
});

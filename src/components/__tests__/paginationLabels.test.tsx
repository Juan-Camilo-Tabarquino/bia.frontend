import React, { StrictMode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Pagination } from "antd";

import { paginationArrows } from "@/components/paginationLabels";

/**
 * Guards `paginationArrows`, the prev/next control its `itemRender` relabels.
 *
 * WHY this suite exists: `@ant-design/icons` sets `aria-label="left"` on the
 * arrow icon, and a child's `aria-label` beats the parent `<li>`'s translated
 * `title` in the accessible-name computation. The browser measurement recorded
 * in `src/components/paginationLabels.tsx` shows the control announced as
 * "left" even under `locale={esES}`, because the literal "left" is the icon's
 * name and never passes through antd's locale system. NO antd locale can fix
 * it; only overriding the button's own label changes the name.
 *
 * The suite also guards the second half of that fix: `itemRender`'s `element`
 * for `prev`/`next` is ALREADY the complete
 * `<button class="ant-pagination-item-link">` antd built, so the Spanish label
 * must be applied to that element. Wrapping it in a second `<button>` compiles
 * the defect into invalid HTML (`<button>` cannot descend from `<button>`), a
 * React `validateDOMNesting` error in dev, and leaves the nested original
 * button — and therefore the name "left"/"right" — in the accessibility tree.
 * Three assertions below fail on that wrapped shape.
 *
 * The neighbouring `AnomalyTable` / `ReadingsTable` pagination suites only read
 * page NUMBERS and the English `<li>` titles and never click the arrows, so
 * neither half of the fix — the Spanish name and the click path it replaced —
 * is covered there. This suite renders the real `Pagination` bare (no
 * `ConfigProvider`, like those suites), under `StrictMode` because `next dev`
 * runs with it and antd's paginator carries effects.
 */
describe("paginationArrows", () => {
  function renderPaginator() {
    return render(
      <StrictMode>
        <Pagination total={50} itemRender={paginationArrows} />
      </StrictMode>,
    );
  }

  /**
   * The arrow control, located STRUCTURALLY (the item's own direct child)
   * rather than by the name under test. That is what keeps the defect
   * assertions falsifiable: drop the control's `aria-label` and its name falls
   * back to the icon's "left"/"right" instead of the Spanish label.
   */
  function arrowControl(container: HTMLElement, type: "prev" | "next") {
    const control = container.querySelector(
      `.ant-pagination-${type} > .ant-pagination-item-link`,
    );
    if (!(control instanceof HTMLElement)) {
      throw new Error(`no arrow control inside .ant-pagination-${type}`);
    }
    return control;
  }

  /**
   * MUST be the first test that renders the paginator in this file.
   *
   * React reports `validateDOMNesting` once per (child, ancestor) pair and
   * remembers it in module scope, so a later render emits nothing and a spy
   * installed around it would pass vacuously. Running this render first is what
   * makes the assertion falsifiable, and the M2 mutation (restore the wrapper)
   * is what proves the ordering holds: it re-arms this very render.
   *
   * React 19 dropped the `validateDOMNesting(...)` prefix and now logs
   * `<button> cannot contain a nested <button>.` as a format string plus args,
   * so the predicate matches the current wording and its pre-19 form.
   */
  it("renders antd's arrow without React's nested-button warning", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      renderPaginator();

      const nestingWarnings = errorSpy.mock.calls
        .map((args) => args.map(String).join(" "))
        .filter((message) =>
          /validateDOMNesting|cannot contain a nested|cannot be a descendant of/.test(
            message,
          ),
        );

      expect(nestingWarnings).toEqual([]);
    } finally {
      // Scoped restore: the spy exists only for this render, so it cannot mask
      // a nesting error in any other test.
      errorSpy.mockRestore();
    }
  });

  it("overrides antd's own button instead of nesting a second one", () => {
    // The DEFECT stated structurally. antd hands `itemRender` its finished
    // `<button class="ant-pagination-item-link">`; a fix that wraps it adds a
    // DOM level that HTML forbids, whether or not any name assertion notices.
    const { container } = renderPaginator();

    expect(container.querySelectorAll("button button")).toHaveLength(0);
    expect(
      container.querySelectorAll(".ant-pagination-prev button button"),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll(".ant-pagination-next button button"),
    ).toHaveLength(0);
  });

  it("leaves no paginator control named after the icon", () => {
    // The defect this file exists to remove, stated where it actually lives:
    // with the wrapping fix the NESTED original button still carried the
    // icon's name, so `itemRender` renamed only the wrapper and a screen reader
    // still reached "left" and "right".
    const { container } = renderPaginator();

    expect(within(container).queryByRole("button", { name: "left" })).toBeNull();
    expect(
      within(container).queryByRole("button", { name: "right" }),
    ).toBeNull();
  });

  it("names the prev and next controls in Spanish, by role", () => {
    // How a screen reader reaches them: by role and accessible name, never by
    // title and never by CSS class.
    renderPaginator();

    expect(
      screen.getByRole("button", { name: "Página anterior" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Página siguiente" }),
    ).toBeInTheDocument();
  });

  it("does not let the icon's or antd's English label take the control", () => {
    // The DEFECT stated explicitly. The negative half is the only half that can
    // tell which competing label won the name computation; the positive guard
    // at the end keeps "not left/right" from passing on an empty name.
    const { container } = renderPaginator();

    expect(arrowControl(container, "prev")).not.toHaveAccessibleName("left");
    expect(arrowControl(container, "next")).not.toHaveAccessibleName("right");
    expect(arrowControl(container, "prev")).not.toHaveAccessibleName("Previous Page");
    expect(arrowControl(container, "next")).not.toHaveAccessibleName("Next Page");

    expect(arrowControl(container, "prev")).toHaveAccessibleName("Página anterior");
    expect(arrowControl(container, "next")).toHaveAccessibleName("Página siguiente");
  });

  it("keeps antd's own arrow graphic inside the control", () => {
    // antd's <span role="img" aria-label="left"> renders inside its own button
    // with or without `itemRender`, so it must survive a fix that only overrides
    // attributes. It stays a child of the control, which is why the control
    // needs its own `aria-label` to outrank it.
    const { container } = renderPaginator();

    expect(
      within(arrowControl(container, "prev")).getByRole("img", {
        name: "left",
      }),
    ).toBeInTheDocument();
    expect(
      within(arrowControl(container, "next")).getByRole("img", {
        name: "right",
      }),
    ).toBeInTheDocument();
  });

  it("still pages: the relabelled buttons drive the active page", () => {
    // Touching antd's button risks breaking the click path the surrounding
    // `<li>` owns. Page-number assertions never exercise the arrows.
    const { container } = renderPaginator();
    const activeTitle = () =>
      container.querySelector(".ant-pagination-item-active")?.getAttribute("title");

    expect(activeTitle()).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(activeTitle()).toBe("2");

    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
    expect(activeTitle()).toBe("1");
  });
});

import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Gives antd's paginator arrows a Spanish accessible name.
 *
 * ## The problem, measured in a real browser (antd 6.6.5, `locale={esES}`)
 *
 * ```text
 * listitem  →  name: "Página anterior"   ← the locale translated this
 *   button  →  name: "left"              ← but this is what a screen reader says
 *     image →  name: "left"
 * ```
 *
 * antd builds the arrow as:
 *
 * ```jsx
 * <button className="ant-pagination-item-link" type="button" tabIndex={-1}>
 *   <LeftOutlined />          // the icon uses its own name as aria-label
 * </button>
 * ```
 *
 * and `@ant-design/icons` sets `aria-label="left"` on the icon. The accessible
 * name of the button resolves from that child, and **a child's `aria-label`
 * beats the parent's translated `title`** in the accessible name computation.
 *
 * **No antd locale can fix this.** `es_ES` defines `prev_page` / `next_page`,
 * and antd spends them only on the `<li title>`. The literal "left" is the
 * icon's name and never passes through the locale system.
 *
 * ## Why this overrides antd's own button instead of wrapping it
 *
 * For `type === "prev" | "next"`, `itemRender`'s `element` is **already the
 * whole `<button class="ant-pagination-item-link" type="button" tabIndex={-1}>`**
 * antd built: `antd/es/pagination/Pagination.js` passes that button as
 * `prevIcon`/`nextIcon`, and `@rc-component/pagination`'s `getItemIcon` hands it
 * straight to `itemRender` as `element`.
 *
 * Wrapping that element in a new `<button>` renders
 * `<button>…<button>…</button></button>`: a `<button>` cannot descend from a
 * `<button>`, so React logs a `validateDOMNesting` error in dev, and the
 * ORIGINAL button — still named "left"/"right" by its icon child — remains in
 * the accessibility tree as a second control. The wrapper's own label is then
 * correct while the defect the file exists to remove is still present.
 *
 * Overriding the element's own `aria-label` adds no DOM level. An element's own
 * `aria-label` outranks both its children's labels and its `title`, so the
 * control is announced in Spanish while the arrow still renders inside it.
 * `type="button"` is re-applied deliberately: antd already sets it, and pinning
 * it here keeps the control from becoming an implicit submit button if a future
 * antd release changes the element it hands over.
 *
 * The icon's own `<span role="img" aria-label="left">` stays inside the button.
 * It is antd's baseline structure — it renders with or without `itemRender` —
 * and it is an image, not an interactive control, so it is deliberately left
 * alone.
 */

/**
 * Clones `element` with a Spanish accessible name, so the DOM gains no level.
 *
 * Written as a named function rather than an inline arrow so the intent is
 * clear: this is a render CALLBACK handed to antd, not a React component.
 */
function renderPaginationItem(
  labels: { previous: string; next: string },
  type: string,
  element: ReactNode,
): ReactNode {
  if (type !== "prev" && type !== "next") {
    return element;
  }
  // `element` is typed `ReactNode`, but antd always hands over a built element
  // for prev/next (`getItemIcon` returns the icon element itself). `cloneElement`
  // needs an element, so anything else is passed through rather than guessed at.
  if (!isValidElement(element)) {
    return element;
  }
  const name = type === "prev" ? labels.previous : labels.next;
  return cloneElement(element as ReactElement<Record<string, unknown>>, {
    "aria-label": name,
    // Kept alongside the `aria-label`: the label wins the name computation, and
    // the title keeps the hover tooltip in step with the name.
    title: name,
    type: "button",
  });
}

export function paginationArrowLabels(labels: {
  previous: string;
  next: string;
}): (page: number, type: string, element: ReactNode) => ReactNode {
  return (_page, type, element) => renderPaginationItem(labels, type, element);
}

/** Spanish names for the paginator arrows, shared by every paginated table. */
export const PAGINATION_LABELS = {
  previous: "Página anterior",
  next: "Página siguiente",
} as const;

/** Ready-made override for `pagination.itemRender`. */
export const paginationArrows = paginationArrowLabels(PAGINATION_LABELS);

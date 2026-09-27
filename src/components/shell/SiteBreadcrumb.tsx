"use client";

import { Breadcrumb } from "antd";
import type { BreadcrumbProps } from "antd";
import { usePathname } from "next/navigation";
import type { AriaAttributes } from "react";

import styles from "./SiteBreadcrumb.module.scss";

/** One entry of antd 6's `items` API. */
type TrailItem = NonNullable<BreadcrumbProps["items"]>[number];

/** The app's entry point: every trail starts with the Bia mark. */
const HOME: TrailItem = { title: "Bia", href: "/meters" };

/** The current page: plain text, no link, marked as the active breadcrumb. */
const current = (title: string): TrailItem => ({
  title,
  "aria-current": "page",
});

const linked = (title: string, href: string): TrailItem => ({ title, href });

/**
 * Splits a raw pathname segment into what a human reads and what the URL
 * carries.
 *
 * `usePathname()` returns the **encoded** pathname, so rendering a segment
 * verbatim shows `M%20109%2FA` instead of the id the API actually uses (seen in
 * a real browser). Decoding is therefore required for the label, and the result
 * must be re-encoded for the href -- `encodeURIComponent`, the same convention
 * `MeterDetail` and `AnomalyDetail` already use -- or a decoded `/` would be
 * read as a path separator and the link would address a different route.
 *
 * `decodeURIComponent` throws `URIError` on a malformed escape (`%ZZ`). That
 * input can only come from a hand-crafted or externally produced link, and the
 * choice here is to degrade to the pre-existing behaviour rather than to guess:
 * the raw segment is used for both label and href, so the trail never blanks,
 * never throws, and never points somewhere the browser is not.
 */
function splitSegment(segment: string): { label: string; slug: string } {
  try {
    const decoded = decodeURIComponent(segment);
    return { label: decoded, slug: encodeURIComponent(decoded) };
  } catch {
    return { label: segment, slug: segment };
  }
}

const SECTION_LABELS = {
  meters: "Medidores",
  dashboard: "Análisis",
  anomalies: "Anomalías",
} as const;

/**
 * Maps a pathname to its breadcrumb trail.
 *
 * Returns `null` for any path this app does not own, so an unknown or malformed
 * URL renders no breadcrumb rather than a broken or misleading one.
 *
 * The meter id and the anomaly id are route data: they never pass through a
 * label map, and they are decoded for display (see `splitSegment`).
 */
function buildTrail(pathname: string): TrailItem[] | null {
  const [first, second, third] = pathname.split("/").filter(Boolean);

  if (first === "meters" && second === undefined) {
    return [HOME, current(SECTION_LABELS.meters)];
  }

  if (first === "meter" && second !== undefined && third === undefined) {
    return [
      HOME,
      linked(SECTION_LABELS.meters, "/meters"),
      current(splitSegment(second).label),
    ];
  }

  if (first === "meter" && second !== undefined && third === "readings") {
    const meter = splitSegment(second);
    return [
      HOME,
      linked(SECTION_LABELS.meters, "/meters"),
      linked(meter.label, `/meter/${meter.slug}`),
      current("Lecturas"),
    ];
  }

  if (first === "dashboard" && second === undefined) {
    return [HOME, current(SECTION_LABELS.dashboard)];
  }

  if (first === "anomalies" && second === undefined) {
    return [HOME, current(SECTION_LABELS.anomalies)];
  }

  if (first === "anomalies" && second !== undefined && third === undefined) {
    return [
      HOME,
      linked(SECTION_LABELS.anomalies, "/anomalies"),
      current(splitSegment(second).label),
    ];
  }

  return null;
}

/*
 * `aria-label` is not part of `BreadcrumbProps`, but antd spreads unrecognised
 * props onto its root `<nav>`, so a typed `AriaAttributes` spread gives the
 * landmark a Spanish name without a cast.
 */
const BREADCRUMB_NAV: AriaAttributes = {
  "aria-label": "Ruta de navegación",
};

/**
 * Breadcrumb trail for the current route.
 *
 * Uses antd 6's `items` API; the `Breadcrumb.Item` children and `routes` props
 * are marked deprecated in `antd/es/breadcrumb/index.d.ts`. antd does not emit
 * `aria-current` on its own, so the last item carries it explicitly.
 */
export function SiteBreadcrumb() {
  const pathname = usePathname();
  const trail = pathname ? buildTrail(pathname) : null;

  if (trail === null) {
    return null;
  }

  return (
    <Breadcrumb
      items={trail}
      className={`shell-container ${styles.breadcrumb}`}
      {...BREADCRUMB_NAV}
    />
  );
}

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
 * The meter id and the anomaly id are route data: they are rendered verbatim
 * and never passed through a label map.
 */
function buildTrail(pathname: string): TrailItem[] | null {
  const [first, second, third] = pathname.split("/").filter(Boolean);

  if (first === "meters" && second === undefined) {
    return [HOME, current(SECTION_LABELS.meters)];
  }

  if (first === "meter" && second !== undefined && third === undefined) {
    return [HOME, linked(SECTION_LABELS.meters, "/meters"), current(second)];
  }

  if (first === "meter" && second !== undefined && third === "readings") {
    return [
      HOME,
      linked(SECTION_LABELS.meters, "/meters"),
      linked(second, `/meter/${second}`),
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
    return [HOME, linked(SECTION_LABELS.anomalies, "/anomalies"), current(second)];
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

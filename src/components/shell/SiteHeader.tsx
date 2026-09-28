"use client";

import {
  AlertOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Badge, Button, Layout, Space, Tooltip } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";

import { useGetDashboardSummaryQuery } from "@/features/api/apiSlice";
import { useSession } from "@/features/auth/session";
import { brand } from "../../theme/tokens";
import { useThemeMode } from "../../theme/theme-provider";
import styles from "./SiteHeader.module.scss";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Prefix match so detail routes keep their section highlighted. */
  isActive: (pathname: string) => boolean;
}

const isOnBranch = (pathname: string, base: string): boolean =>
  pathname === base || pathname.startsWith(`${base}/`);

/**
 * The three application destinations. `/meter/...` belongs to Medidores and
 * `/anomalies/...` to Anomalías, so both are matched by prefix, never equality.
 */
const navItems: NavItem[] = [
  {
    href: "/meters",
    label: "Medidores",
    icon: <ThunderboltOutlined />,
    isActive: (pathname) =>
      isOnBranch(pathname, "/meters") || isOnBranch(pathname, "/meter"),
  },
  {
    href: "/dashboard",
    label: "Análisis",
    icon: <LineChartOutlined />,
    isActive: (pathname) => isOnBranch(pathname, "/dashboard"),
  },
  {
    href: "/anomalies",
    label: "Anomalías",
    icon: <AlertOutlined />,
    isActive: (pathname) => isOnBranch(pathname, "/anomalies"),
  },
];

/** Stable id of the visually hidden text that announces the anomaly count. */
const ANOMALY_BADGE_DESCRIPTION_ID = "anomalies-badge-description";

/**
 * Brand, primary navigation and theme toggle. It lives outside the layout so
 * the active-route and theme state can be read from the client.
 *
 * The anomaly badge reads `GET /dashboard/summary` from the shell, so it costs
 * one request per session rather than one per route: RTK Query keeps a single
 * cache entry for the endpoint in the shared store, and later mounts reuse the
 * cached value instead of issuing another request. The badge stays silent while
 * the request is in flight or failed, and the page that owns the data reports
 * its own errors.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, toggle } = useThemeMode();
  const { session, signOut } = useSession();
  const { data: summary, isLoading, error } = useGetDashboardSummaryQuery();

  const handleSignOut = useCallback((): void => {
    signOut();
    router.replace("/login");
  }, [router, signOut]);

  // Only a positive count from a settled, successful request is shown: a
  // loading or failed summary must never surface as a badge, and zero is not a
  // badge either.
  const anomalyCount =
    !isLoading && !error && typeof summary?.anomalies === "number"
      ? summary.anomalies
      : 0;
  const showAnomalyBadge = anomalyCount > 0;

  const isDark = mode === "dark";
  const toggleLabel = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  return (
    <Layout.Header className={styles.header}>
      <div className={`shell-container ${styles.inner}`}>
        <Link href="/meters" className={styles.brand}>
          <svg
            className={styles.bolt}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M13 2 4 13.5h6.2L9 22l9-11.5h-6.2z" fill="currentColor" />
          </svg>
          {/*
           * The wordmark keeps a single inline style on purpose: the gradient
           * is the brand mark and must use the exact traced `brand` values, so
           * it is not a layout property and does not belong in the layout
           * module. Everything else that used to be inline is now in CSS.
           */}
          <span
            className={styles.wordmark}
            style={{
              backgroundImage: `linear-gradient(120deg, ${brand.teal}, ${brand.tealBright})`,
            }}
          >
            Bia
          </span>
        </Link>

        <nav aria-label="Navegación principal" className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const active = item.isActive(pathname ?? "");
              const hasBadge = item.href === "/anomalies" && showAnomalyBadge;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${styles.navLink} ${
                      active ? styles.navLinkActive : ""
                    }`}
                    aria-current={active ? "page" : undefined}
                    aria-describedby={
                      hasBadge ? ANOMALY_BADGE_DESCRIPTION_ID : undefined
                    }
                  >
                    <span className={styles.navIcon} aria-hidden="true">
                      {hasBadge ? (
                        <Badge count={anomalyCount} size="small">
                          {item.icon}
                        </Badge>
                      ) : (
                        item.icon
                      )}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                  {/*
                   * Outside the link so the count is an accessible description
                   * rather than part of the destination name; the visible label
                   * stays the plain destination name.
                   */}
                  {hasBadge && (
                    <span
                      id={ANOMALY_BADGE_DESCRIPTION_ID}
                      className="sr-only"
                    >
                      {anomalyCount} anomalías
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <Tooltip title={toggleLabel}>
          <Button
            type="text"
            className={styles.toggle}
            aria-label={toggleLabel}
            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggle}
          />
        </Tooltip>

        {/*
         * The signed-in user and the logout control. Both are hidden until
         * `useSession` has read storage, so the server render and the first
         * client render agree (no session yet).
         */}
        {session && (
          <Space size={4} align="center">
            <span className="sr-only">Sesión iniciada como</span>
            <span>{session.user.name}</span>
            <Tooltip title="Cerrar sesión">
              <Button
                type="text"
                aria-label="Cerrar sesión"
                icon={<LogoutOutlined />}
                onClick={handleSignOut}
              />
            </Tooltip>
          </Space>
        )}
      </div>
    </Layout.Header>
  );
}

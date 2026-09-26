"use client";

import {
  AlertOutlined,
  LineChartOutlined,
  MoonOutlined,
  SunOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, Layout, Tooltip } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

/**
 * Brand, primary navigation and theme toggle. It lives outside the layout so
 * the active-route and theme state can be read from the client.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { mode, toggle } = useThemeMode();

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
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${styles.navLink} ${
                      active ? styles.navLinkActive : ""
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className={styles.navIcon} aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
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
      </div>
    </Layout.Header>
  );
}

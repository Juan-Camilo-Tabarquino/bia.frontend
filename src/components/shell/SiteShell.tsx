"use client";

import { Layout } from "antd";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BackendStatus } from "../BackendStatus";
import PrivateRoute from "../PrivateRoute";
import { SiteBreadcrumb } from "./SiteBreadcrumb";
import { SiteHeader } from "./SiteHeader";
import styles from "./SiteShell.module.scss";

const { Content, Footer } = Layout;

/**
 * Application shell.
 *
 * This is a client module on purpose: antd's `Layout.Content` and
 * `Layout.Footer` are static properties attached to the client component at
 * runtime, and a server component only sees an opaque client reference, so
 * reading those statics on the server yields `undefined` and breaks rendering.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // `/login` is the one route without chrome: it is the entry point, so the
  // header, the navigation and the breadcrumb would be dead weight (and the
  // header's logout control would ask a signed-out visitor to sign out). The
  // shell is the only place that conditionally hides them.
  const isLoginRoute = pathname === "/login";

  return (
    <Layout className={styles.layout}>
      {/* One-shot health toast. Renders nothing and never polls. */}
      <BackendStatus />
      {isLoginRoute ? null : (
        <>
          <SiteHeader />
          <SiteBreadcrumb />
        </>
      )}
      <Content className={`shell-container ${styles.content}`}>
        {/*
         * One guard for every demo route, applied in the shell so suite pages
         * rendered directly in tests are never wrapped by it. `PrivateRoute`
         * skips `/login`, so this mount can never loop.
         */}
        <PrivateRoute>{children}</PrivateRoute>
      </Content>
      <Footer className={styles.footer}>
        Bia · {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}

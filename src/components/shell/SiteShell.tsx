"use client";

import { Layout } from "antd";
import type { ReactNode } from "react";

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
  return (
    <Layout className={styles.layout}>
      <SiteHeader />
      <SiteBreadcrumb />
      <Content className={`shell-container ${styles.content}`}>{children}</Content>
      <Footer className={styles.footer}>
        Bia · {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}

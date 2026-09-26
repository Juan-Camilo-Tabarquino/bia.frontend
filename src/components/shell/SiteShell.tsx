"use client";

import { Layout } from "antd";
import type { ReactNode } from "react";

import { SiteHeader } from "./SiteHeader";

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
    <Layout style={{ minHeight: "100vh" }}>
      <SiteHeader />
      <Content
        className="shell-container"
        style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}
      >
        {children}
      </Content>
      <Footer style={{ textAlign: "center" }}>
        Bia · {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}

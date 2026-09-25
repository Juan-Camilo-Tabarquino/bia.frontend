import { Layout } from "antd";
import Link from "next/link";
import "../styles/globals.scss";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "BIA — Meter Consumption Analytics",
  description:
    "BIA console for meter health, consumption readings and anomaly monitoring.",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/meters", label: "Meters" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/anomalies", label: "Anomalies" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Layout style={{ minHeight: "100vh" }}>
            <header className="site-header">
              <nav aria-label="Primary" className="site-nav">
                <ul>
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </header>
            <main>{children}</main>
          </Layout>
        </Providers>
      </body>
    </html>
  );
}

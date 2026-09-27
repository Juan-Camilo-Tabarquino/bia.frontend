import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { AntdRegistry } from "@ant-design/nextjs-registry";

import "antd/dist/reset.css";
import "../styles/globals.scss";

import { SiteShell } from "../components/shell/SiteShell";
import { CSS_VAR_SCOPE_CLASS } from "../theme/tokens";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Bia | Monitoreo energético",
    template: "%s · Bia",
  },
  description:
    "Panel de Bia para el estado de los medidores, el consumo y el monitoreo de anomalías.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${CSS_VAR_SCOPE_CLASS}`}>
      <body>
        {/*
         * `AntdRegistry` extracts antd's CSS-in-JS output during server
         * rendering. Without it the server ships antd markup with no antd
         * stylesheet at all, so the first paint is unstyled and the `--bia-*`
         * variables are undefined, which also drops the `body` background.
         */}
        <AntdRegistry>
          <Providers>
            <SiteShell>{children}</SiteShell>
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}

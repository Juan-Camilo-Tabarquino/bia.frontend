
"use client";


import { Layout } from "antd";
import { store } from "../features/store";
import { Provider } from "react-redux";
import "../styles/globals.scss";

import { ReactNode } from "react";



export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        <Provider store={store}>
          <Layout style={{ minHeight: "100vh" }}>{children}</Layout>
        </Provider>
      </body>
    </html>
  );
}


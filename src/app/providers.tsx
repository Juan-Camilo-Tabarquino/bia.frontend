"use client";

import { App as AntdApp } from "antd";
import { Provider } from "react-redux";
import { ReactNode } from "react";
import { store } from "../features/store";
import { ThemeProvider } from "../theme/theme-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AntdApp>{children}</AntdApp>
      </ThemeProvider>
    </Provider>
  );
}

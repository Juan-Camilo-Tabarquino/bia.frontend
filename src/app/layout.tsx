import * as Sentry from "@sentry/nextjs";
import "@/sentry.client.config";
import { ReactNode } from "react";
import { Layout } from "antd";
import { store } from "../features/store";
import { Provider } from "react-redux";
import "../styles/globals.scss";

export const metadata = {
  title: "AI Energy Dashboard",
  description: "Monitor and analyze energy consumption",
};

import { AuthProvider } from "../context/AuthContext";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
          <Layout style={{ minHeight: "100vh" }}>{children}</Layout>
        </Sentry.ErrorBoundary>
      </AuthProvider>
    </Provider>
  );
}

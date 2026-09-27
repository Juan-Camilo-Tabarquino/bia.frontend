"use client";

import { App as AntdApp, ConfigProvider } from "antd";
import esES from "antd/locale/es_ES";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { Provider } from "react-redux";
import { ReactNode } from "react";
import { store } from "../features/store";
import { ThemeProvider } from "../theme/theme-provider";

/*
 * antd's OWN strings (the paginator `title`s, the `DatePicker` panel, the
 * table's `No data`) come from antd's locale bundle, not from any literal in
 * this repository, so no grep of our source can find them. `locale={esES}` on
 * the provider chain is the only way to translate them, and it has to sit above
 * every antd component, so it wraps the theme provider.
 *
 * `locale` is intentionally on an OUTER `ConfigProvider`: antd merges a nested
 * `ConfigProvider` over its parent context, so the theme provider's own
 * `ConfigProvider` (which sets only `theme`) inherits this locale instead of
 * needing a second import.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ConfigProvider locale={esES}>
        <ThemeProvider>
          <AntdApp>{children}</AntdApp>
        </ThemeProvider>
      </ConfigProvider>
    </Provider>
  );
}

/*
 * `dayjs.locale("es")` is a global mutation on dayjs's default instance, which
 * antd's `DatePicker`/`RangePicker` read to render Spanish month and weekday
 * names. It is set at MODULE scope on purpose, not from a `useEffect`:
 *
 * - This client module is imported statically by the root layout, so it is
 *   evaluated in BOTH the server and the browser module graphs before anything
 *   renders, keeping the global identical in the two environments. An effect
 *   would instead render once with the `en` default and mutate afterwards.
 * - Nothing here renders a dayjs-formatted date during SSR. Every date the app
 *   shows goes through `formatDateTime`, which uses `Intl`, and the DatePicker
 *   calendar is a client-only interaction, so there is no locale-dependent
 *   server output for hydration to disagree with.
 *
 * The `import "dayjs/locale/es"` above only REGISTERS the locale; the call
 * below is what selects it globally.
 */
dayjs.locale("es");

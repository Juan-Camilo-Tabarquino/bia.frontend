# Arquitectura de carpetas del Frontend

Esta guía describe la organización de carpetas y su responsabilidad dentro del proyecto Next.js (App Router). Todo el código vive en la raíz del repositorio; no existe un prefijo `frontend/`. El diagrama lista las carpetas de código: omite los directorios `__tests__/`, el archivo `src/app/favicon.ico` y los archivos de configuración de la raíz.

```
.
├─ src/
│  ├─ app/                    # App Router (rutas, layout y providers)
│  │  ├─ layout.tsx           # Layout raíz: `AntdRegistry`, providers y `<html class="bia-theme">`
│  │  ├─ providers.tsx        # Providers de cliente (Redux + antd `ConfigProvider` + tema)
│  │  ├─ page.tsx             # Ruta `/`: redirige a `/dashboard`
│  │  ├─ dashboard/           # Ruta `/dashboard`
│  │  ├─ meters/              # Ruta `/meters` (grid de cards)
│  │  ├─ anomalies/           # Rutas `/anomalies` y `/anomalies/[id]`
│  │  └─ meter/[id]/          # Rutas `/meter/[id]` y `/meter/[id]/readings`
│  ├─ api/
│  │  └─ backend.ts           # Wrapper de axios para llamadas puntuales (p. ej. `GET /health`)
│  ├─ components/             # Componentes UI reutilizables
│  │  ├─ BackendStatus.tsx    # Toast de salud del backend (una vez, sin polling)
│  │  ├─ MeterCard.tsx        # Card cliqueable de un medidor (stretched link)
│  │  ├─ MeterDetail.tsx      # Detalle de medidor
│  │  ├─ MeterList.tsx        # Lista de medidores en grid de cards
│  │  ├─ PrivateRoute.tsx     # Guardia real de rutas: sin sesión válida redirige a `/login` (lee `useSession` de `src/features/auth/session.ts`); se monta una sola vez en el shell
│  │  ├─ RequestError.tsx     # Vocabulario único de error con "Reintentar"
│  │  ├─ formatters.ts        # Formateo de fechas, porcentajes y labels de estado
│  │  ├─ paginationLabels.tsx # Nombres accesibles en español para las flechas de paginación
│  │  ├─ shell/               # Shell: `SiteShell`, `SiteHeader`, `SiteBreadcrumb`
│  │  ├─ anomalies/           # Componentes de anomalías (lista, detalle y narrativa)
│  │  └─ dashboard/           # Componentes de dashboard, gráficos y tablas
│  ├─ features/               # Slices de RTK Query y store
│  │  ├─ auth/                # Sesión: `session.ts` (`useSession`) y `authHeaders.ts`
│  │  ├─ api/                 # apiSlice: meters, anomalies, dashboard summary
│  │  ├─ data/                # dataApi: lecturas de medidor
│  │  ├─ dashboards/          # dashboardApi: flujo de análisis con IA
│  │  └─ store/               # configureStore e integración de los tres slices
│  ├─ hooks/                  # Hooks de UI (`useDebouncedValue`, `useUrlState`)
│  ├─ styles/                 # SCSS global (`globals.scss`; `variables.scss` fue eliminado)
│  ├─ test-support/           # Dobles de tests compartidos (`rechartsMock.ts`)
│  ├─ theme/                  # Capa de tokens (`tokens.ts`) y `theme-provider.tsx`
│  ├─ types/                  # DTOs de TypeScript (`backend.ts`) y tipos de entorno
│  └─ utils/
│     └─ apiBaseUrl.ts        # Resuelve `NEXT_PUBLIC_API_URL` (defecto `apiBaseUrl-never-inlined`)
├─ docs/                      # Documentación del proyecto
├─ odd/                       # Tareas del flujo ODD
├─ public/                    # Archivos estáticos
└─ .github/workflows/         # CI (lint, test, build)
```

## Principios

- Cada nivel representa una **responsabilidad** clara.
- Los componentes UI son **presentacionales** y no contienen lógica de negocio.
- La lógica de datos vive en `src/features` con **RTK Query**, no en slices de estado manuales.
- La URL base de la API sale siempre de `src/utils/apiBaseUrl.ts` (`NEXT_PUBLIC_API_URL`); ningún otro módulo lee la variable de entorno por su cuenta.
- La mayoría de las llamadas al backend pasan por los **tres slices de RTK Query** registrados en `src/features/store/index.ts`:
  - `apiSlice` (`src/features/api/apiSlice.ts`) — meters, anomalies, dashboard summary.
  - `dataApi` (`src/features/data/dataAPI.ts`) — lecturas de medidor.
  - `dashboardApi` (`src/features/dashboards/dashboardAPI.ts`) — análisis con IA.
- `src/api/backend.ts` es un wrapper de axios que se conserva solo para llamadas puntuales fuera de RTK Query, por ejemplo `GET /health` usado por `BackendStatus` (toast de arranque). No es el único camino de acceso a la API.
- La identidad visual vive en `src/theme/tokens.ts`: un solo módulo que alimenta el `ConfigProvider` y emite las variables CSS `--bia-*` (prefijo `bia`, clase de scope `bia-theme` en `<html>`). Los módulos SCSS leen esas variables en vez de repetir hexágonos.
- El shell (`src/components/shell/`) es el marco común a todas las rutas: `SiteShell` compone el header, el breadcrumb y el contenido; `SiteHeader` monta la navegación de tres destinos y el toggle de tema; `SiteBreadcrumb` deriva el rastro del pathname.
- Los estilos de componente se gestionan con módulos SCSS (`*.module.scss`) para evitar colisiones; el único SCSS global es `src/styles/globals.scss`, que `src/app/layout.tsx` importa. No hay `variables.scss`: se eliminó y los colores se resuelven por las variables de antd.

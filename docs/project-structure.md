# Arquitectura de carpetas del Frontend

Esta guía describe la organización de carpetas y su responsabilidad dentro del proyecto Next.js (App Router). Todo el código vive en la raíz del repositorio; no existe un prefijo `frontend/`.

```
.
├─ src/
│  ├─ app/                    # App Router (rutas, layout y providers)
│  │  ├─ layout.tsx           # Layout raíz
│  │  ├─ providers.tsx        # Providers de cliente (store de Redux)
│  │  ├─ page.tsx             # Ruta `/`
│  │  ├─ dashboard/           # Ruta `/dashboard`
│  │  ├─ meters/              # Ruta `/meters`
│  │  ├─ anomalies/           # Rutas `/anomalies` y `/anomalies/[id]`
│  │  └─ meter/[id]/          # Rutas `/meter/[id]` y `/meter/[id]/readings`
│  ├─ api/
│  │  └─ backend.ts           # Wrapper de axios para llamadas puntuales (p. ej. `GET /health`)
│  ├─ components/             # Componentes UI reutilizables
│  │  ├─ HealthStatus.tsx     # Estado de salud del backend
│  │  ├─ MeterDetail.tsx      # Detalle de medidor
│  │  ├─ MeterList.tsx        # Lista de medidores
│  │  ├─ PrivateRoute.tsx     # Pass-through (no hay autenticación implementada)
│  │  ├─ anomalies/           # Componentes de anomalías (lista, detalle y narrativa)
│  │  └─ dashboard/           # Componentes de dashboard, gráficos y tablas
│  ├─ features/               # Slices de RTK Query y store
│  │  ├─ api/                 # apiSlice: meters, anomalies, dashboard summary (y `/events`, sin uso)
│  │  ├─ data/                # dataApi: lecturas de medidor
│  │  ├─ dashboards/          # dashboardApi: flujo de análisis con IA
│  │  └─ store/               # configureStore e integración de los tres slices
│  ├─ styles/                 # SCSS global y variables de estilo
│  ├─ types/                  # DTOs de TypeScript (`backend.ts`) y tipos de entorno
│  └─ utils/
│     └─ apiBaseUrl.ts        # Resuelve `NEXT_PUBLIC_API_URL`
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
  - `apiSlice` (`src/features/api/apiSlice.ts`) — meters, anomalies, dashboard summary y `/events`. El backend **no expone** `/events`: el endpoint queda declarado en el slice pero no se consume.
  - `dataApi` (`src/features/data/dataAPI.ts`) — lecturas de medidor.
  - `dashboardApi` (`src/features/dashboards/dashboardAPI.ts`) — análisis con IA.
- `src/api/backend.ts` es un wrapper de axios que se conserva solo para llamadas puntuales fuera de RTK Query, por ejemplo `GET /health` usado por `HealthStatus`. No es el único camino de acceso a la API.
- Los estilos se gestionan con módulos SCSS (`*.module.scss`) para evitar colisiones.

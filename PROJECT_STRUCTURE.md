# Arquitectura de carpetas del Frontend

Esta guía describe la organización de carpetas y su responsabilidad dentro del proyecto Next.js.

```
frontend/
├─ app/                 # Rutas del App Router (páginas)
│   ├─ dashboard/      # Página de análisis general
│   ├─ meter/          # Detalle de medidor (/meter/[id])
│   ├─ meters/         # Lista de medidores
│   └─ ...
├─ components/         # Componentes UI reutilizables
│   ├─ dashboard/      # Componentes específicos del dashboard
│   ├─ HealthStatus.tsx
│   ├─ MeterDetail.tsx
│   └─ MeterList.tsx
├─ features/           # Feature slices (Redux Toolkit)
│   ├─ meters/         # Slice y thunk para medidores
│   ├─ data/           # Slice para datos de análisis
│   └─ dashboards/    # (por definir) slice de dashboard
├─ api/                # Wrapper de llamadas a la API backend (axios)
├─ hooks/              # Custom React hooks (si se añaden en el futuro)
├─ styles/             # SCSS modules y variables de estilo
│   ├─ globals.module.scss
│   └─ variables.module.scss
├─ store/              # Configuración del store Redux
│   └─ index.ts
├─ types/              # Definiciones TypeScript de DTOs (Meter, Reading, etc.)
└─ page.tsx            # Entrada principal de la app
```

## Principios
- Cada nivel representa una **responsabilidad** clara.
- Los componentes UI son **presentacionales** y no contienen lógica de negocio.
- La lógica de datos se mantiene en **features** mediante Redux Toolkit.
- Todas las llamadas a la API pasan por `frontend/src/api/backend.ts`.
- Los estilos se gestionan con módulos SCSS para evitar colisiones.

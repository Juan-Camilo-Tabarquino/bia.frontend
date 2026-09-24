# Tareas para completar el Frontend Specification

Esta lista de tareas corresponde a los hallazgos al revisar el repositorio frente al **Frontend Implementation Plan** (assets/Frontend_implementation_plan.md).

| ID | Título | Descripción | Estado |
|----|--------|-------------|--------|
| 1 | Definir y documentar la estructura de carpetas del proyecto | Crear un documento que detalle la arquitectura de carpetas (`app/`, `components/`, `features/`, `hooks/`, `styles/`, `store/`, `api/`). Añadir diagramas breves y explicar la responsabilidad de cada nivel. | todo |
| 2 | Completar la sección de rutas y páginas | Listar todas las rutas esperadas (`/`, `/meters`, `/meter/[id]`, `/dashboard`, `/settings`, …). Añadir wireframes o descripciones UI y especificar los datos que cada página necesita consumir. | todo |
| 3 | Migrar la gestión de datos a RTK Query | Crear un `apiSlice` con `createApi` que exponga endpoints: `getMeters`, `getMeterDetail`, `getAnalysis`, `getMeterReadings`, `getMeterAnomalies`. Generar los hooks (`useGetMetersQuery`, etc.) y remover los `createAsyncThunk` actuales. | todo |
| 4 | Adaptar los componentes a los hooks de RTK Query | Actualizar `MeterList`, `MeterDetail`, `DashboardPage` y demás componentes para usar los nuevos hooks. Eliminar el código de `useEffect` manual y manejar estados de loading/error con los flags de RTK Query. | todo |
| 5 | Añadir componentes UI faltantes y conectar a la visualización | Implementar uso de `ChartPanel`, `Analyzer` y `ToolProof` dentro de la página de dashboard. Mapear los datos de `/analysis` al formato esperado por los componentes. | todo |
| 6 | Definir tipados TypeScript para los DTO del backend | Crear interfaces (`Meter`, `Reading`, `Analysis`, `Anomaly`, etc.) en `src/types/` y utilizarlas en slices, API y componentes. Eliminar el uso de `any`. | todo |
| 7 | Añadir pruebas unitarias y de integración | Completar la carpeta `__tests__` con pruebas para los slices (`metersSlice`, `dataSlice`), para los componentes (`MeterList`, `MeterDetail`, `DashboardPage`) y para los hooks de RTK Query usando Jest y React Testing Library. | todo |
| 8 | Configurar Vite (o confirmar uso de Next) | Si se decide usar Vite, agregar `vite.config.ts` y adaptar scripts en `package.json`. Si se mantiene Next, actualizar la documentación para indicar que se usa Webpack y remover referencias a Vite del plan. | todo |
| 9 | Mejorar estilos SCSS y estructura de módulos | Verificar que todos los componentes usen archivos `*.module.scss`. Añadir un archivo `src/styles/global.module.scss` y importarlo en `layout.tsx`. Consolidar variables de color y tipografía. | todo |
| 10 | Implementar autenticación y guardas de rutas (opcional) | Añadir flujo de login (JWT/OAuth) y un guardado de rutas que redirija a `/login` si el usuario no está autenticado. Actualizar la documentación del spec. | todo |
| 11 | Configurar CI/CD con GitHub Actions | Crear workflow que ejecute lint, pruebas y build, y despliegue a Vercel (o al entorno configurado). Documentar variables de entorno necesarias. | todo |
| 12 | Añadir accesibilidad (WCAG) e internacionalización | Revisar componentes para cumplir con ARIA, contrastes y teclas de acceso. Configurar `next-i18next` si se requiere soporte multilenguaje. | todo |
| 13 | Integrar monitoreo de errores (Sentry) | Añadir SDK de Sentry en `frontend/src/app/layout.tsx` y capturar excepciones globalmente. | todo |
| 14 | Documentar proceso de desarrollo y contribution guidelines | Añadir `CONTRIBUTING.md` con instrucciones de setup, scripts, normas de código y formato de commits (Conventional Commits). | todo |

*Cada tarea será marcada como `in_progress` cuando se empiece a trabajar y `done` al completarse con los commits correspondientes.*

# Rutas y páginas del Frontend

Este documento describe las rutas expuestas por la aplicación Next.js (App Router, `src/app`) y la información que consume cada página. Todo el código vive en la raíz del repositorio: no existe un prefijo `frontend/`.

## Rutas implementadas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `src/app/page.tsx` | Componente de servidor que solo redirige a `/dashboard` (`redirect("/dashboard")`). No renderiza contenido propio. |
| `/login` | `src/app/login/page.tsx` | Pantalla de acceso (componente de cliente): formulario antd de usuario y contraseña, credenciales de demostración visibles, errores del backend (`400`/`401`/`403`) y redirección a `/dashboard` al iniciar sesión. Si ya hay una sesión válida guardada, redirige fuera de `/login` en lugar de mostrar el formulario. Es la única ruta sin barra superior, navegación ni breadcrumb. |
| `/meters` | `src/app/meters/page.tsx` | Lista completa de medidores. Utiliza el componente `MeterList`. |
| `/meter/[id]` | `src/app/meter/[id]/page.tsx` | Detalle de un medidor específico. Renderiza `MeterDetail` y la acción **análisis con IA** (`AiReanalysis`), que corre el análisis del backend bajo demanda **para ese medidor** y muestra el estado del proceso. |
| `/meter/[id]/readings` | `src/app/meter/[id]/readings/page.tsx` | Lecturas del medidor con gráfico (`ReadingsChart`) y tabla (`ReadingsTable`). |
| `/dashboard` | `src/app/dashboard/page.tsx` | Resumen del dashboard y previsualización de anomalías. |
| `/anomalies` | `src/app/anomalies/page.tsx` | Lista completa de anomalías con filtros y ordenamiento en el navegador. Los filtros y el orden de severidad, prioridad y fecha corren en el navegador; el tipo solo se filtra, no se ordena. El orden que devuelve la API (prioridad ascendente) se describe en `docs/backend-requirements.md`, donde queda confirmado contra el código del backend. |
| `/anomalies/[id]` | `src/app/anomalies/[id]/page.tsx` | Vista de investigación de una anomalía (`AnomalyDetail`): `priority`, `baseline`, cambios con signo, `correlated_events` y `data_quality`. Un id desconocido renderiza un estado 404 dedicado: la página es un componente de cliente, así que no responde el código HTTP. |

## Rutas planificadas (no implementadas)

| Ruta | Estado | Motivo |
|------|--------|--------|
| `/settings` | Planificada | Preferencias del usuario; sin diseño final. |

**Nota**: la sección anterior lista únicamente rutas que todavía no tienen página. Las rutas implementadas consumen los endpoints reales del backend y no agregan ninguno que no exista.

## Autenticación y guardia de rutas

El inicio del flujo de la prueba es **Login → Dashboard**. La autenticación es una simulación de flujo, **no una frontera de seguridad**: el backend solo emite el JWT en `POST /api/auth/login` y **no lo valida en ninguna otra ruta**.

- La sesión vive en `localStorage` bajo la clave **`bia.session.v1`**. El token se decodifica a mano (segmento `base64url` del payload) para leer `sub`, `name`, `authorized` y `exp`; un token ausente, mal formado o vencido se trata como *sin sesión*.
- `PrivateRoute` (`src/components/PrivateRoute.tsx`) es la guardia real: sin sesión válida redirige a `/login` y, con sesión, renderiza los hijos. **Omite `/login`**, de modo que no puede entrar en un bucle de redirección.
- La guardia se monta **una sola vez, en el shell** (`SiteShell`), para cubrir todas las rutas del demo. Las páginas de la suite se renderizan directamente en los tests y nunca montan el shell, por eso la guardia no vive a nivel de página.
- La cabecera (`SiteHeader`) muestra el nombre del usuario y un control de cierre de sesión que borra la sesión y vuelve a `/login`.
- **Las llamadas de los tres slices de RTK Query** agregan `Authorization: Bearer <token>` mediante un único `prepareHeaders` compartido (`src/features/auth/authHeaders.ts`), importado por `apiSlice`, `dataApi` y `dashboardApi`. La excepción es `src/api/backend.ts`, el wrapper de axios que sólo hace `GET /health` para el toast de arranque: ese request sale **sin** token. **No hay interceptor de respuestas**: como el backend no valida el token, no hay un `401` que manejar.

## Wireframes / UI (breve)

- **Home (`/`)**: no renderiza nada; redirige a `/dashboard`. El shell —común a todas las rutas menos `/login`— monta la barra superior, el breadcrumb, el toast de salud del backend (`BackendStatus`) y el footer.
- **Login (`/login`)**: tarjeta centrada con el formulario, el aviso de credenciales de demostración y el error del backend. Sin barra superior, navegación ni breadcrumb.
- **Meters**: título y grid de cards de medidores, cada uno con enlace a su detalle.
- **Meter Detail**: tabla con los campos poblados de `GET /meters/{meterId}` (`id`, `meter_id`, `status`, `created_at`, `readings_count`, `last_reading_at`); `name` y `location` llegan siempre vacíos y la tabla no los renderiza. Debajo de la tabla, la acción **análisis con IA** por medidor dispara el pipeline y dibuja sus siete etapas como estado del proceso. La serie de consumo, voltaje, corriente y factor de potencia llega por `/readings`.
- **Meter Readings**: gráfico de la serie de consumo y tabla de lecturas, con selector de rango de fechas.
- **Dashboard**: resumen de métricas y tabla de anomalías con severidad.

## Datos requeridos por página

| Página | Endpoint(s) del backend | Datos usados |
|--------|--------------------------|--------------|
| Home (`/`) | ninguno | Redirige a `/dashboard`. El shell monta una vez `GET /health` (toast de arranque) y, para el badge de navegación, `GET /dashboard/summary` una vez por sesión. |
| Login (`/login`) | `POST /api/auth/login` | Cuerpo `{token, expires_at, user}`. El token se guarda en `localStorage` (`bia.session.v1`) y su payload se decodifica a mano para el nombre y la expiración. Los errores `400`/`401`/`403` muestran el mensaje del backend; cualquier otra falla muestra un texto genérico. |
| Meters (`/meters`) | `GET /meters` | Array de IDs de medidores. |
| Meter Detail (`/meter/[id]`) | `GET /meters/{meterId}`, `POST /ai/analyze`, `GET /ai/analysis/{id}` | Metadatos reales del medidor: `id`, `meter_id`, `name` (siempre vacío), `location` (siempre vacío), `status` (`OK`/`DEGRADED`), `created_at`, `readings_count`, `last_reading_at`. Medidor desconocido → `404`. La serie numérica llega por `/readings`. La acción **análisis con IA** de la página dispara `POST /ai/analyze` con body `{"meter_id":"<meterId>"}` y, con el `analysisId` devuelto, consume `GET /ai/analysis/{id}`: el POST responde `202` con `{analysisId, meter_id, status:"queued"}` y el análisis corre en el backend, así que la página **lee el `status`** y repite la consulta cada 3 s (`ANALYSIS_POLL_INTERVAL_MS`) mientras sea `queued` o `running`; con cualquier otro valor el polling se detiene. Mientras corre, un `Steps` de antd dibuja las siete etapas reales (`stage`) y el paso activo suma los segundos transcurridos; al completar muestra la narrativa del medidor, su acción recomendada y el resumen de plataforma. Un `400` (medidor desconocido) muestra el `error` del backend y un `failed` el `error` del run. El resultado es **aditivo** y no se refresca automáticamente (los slices de RTK Query no declaran tags de cache). |
| Meter Readings (`/meter/[id]/readings`) | `GET /meters/{meterId}/readings?from&to` | Array de lecturas con **nombres de campo Go**: `MeterID`, `Timestamp`, `Consumption`, `Voltage`, `Current`, `PowerFactor` y `status` opcional (`omitempty`; es el único campo re-etiquetado en minúscula, los otros seis conservan los nombres Go). `from`/`to` son RFC3339, opcionales e inclusivos. Medidor desconocido o ventana vacía → `200 null` (nunca 404). |
| Dashboard (`/dashboard`) | `GET /dashboard/summary`, `GET /anomalies` | Resumen (`health`, `meters`, `anomalies`, `lastRun`) y previsualización de anomalías (DTO `AnomalyDTO`: `id`, `meter_id`, `detected_at`, `type`, `severity`, `confidence`, `reason`, `recommended_action`, `status`, `priority`, `baseline` (`mean`, `stddev`, `count`, `voltage_mean`, `current_mean`, `power_factor_mean`), los cambios con signo `consumption_change_pct`, `voltage_change_pct`, `current_change_pct` y `power_factor_change_pct`, `correlated_events` (`id`, `type`, `start`, `end`, `description`) y `data_quality` (`flagged`, `reason`), más `llm_analysis` opcional). El array se muestra en el orden que devuelve la API (prioridad ascendente); ese orden está confirmado contra el código del backend en `docs/backend-requirements.md`. |
| Anomalies (`/anomalies`) | `GET /anomalies`, `GET /meters` | Array de anomalías (DTO `Anomaly`); el orden que devuelve la API (prioridad ascendente) está confirmado contra el código del backend en `docs/backend-requirements.md`. `GET /anomalies` no acepta parámetros de consulta: los filtros y el orden de severidad, prioridad y fecha corren en el navegador, y el tipo solo se filtra. `GET /meters` alimenta el filtro por medidor. El análisis con IA **ya no vive acá**: se corre por medidor desde su página de detalle. |
| Anomaly Detail (`/anomalies/[id]`) | `GET /anomalies/{id}` | Objeto de anomalía completo: metadatos, `priority`, `baseline`, los cuatro cambios con signo, `correlated_events` y `data_quality`, más `llm_analysis` opcional. Id desconocido → `404`. |

## Capa de API (RTK Query)

Los endpoints se declaran en tres slices de RTK Query, todos registrados en `src/features/store/index.ts`:

| Slice | Archivo | Endpoints |
|-------|---------|-----------|
| `apiSlice` (reducerPath `api`) | `src/features/api/apiSlice.ts` | `POST /auth/login`, `GET /meters`, `GET /meters/{meterId}`, `GET /anomalies`, `GET /anomalies/{id}`, `GET /dashboard/summary` |
| `dataApi` | `src/features/data/dataAPI.ts` | `GET /meters/{meterId}/readings` (parámetros `from`, `to`) |
| `dashboardApi` | `src/features/dashboards/dashboardAPI.ts` | `POST /ai/analyze`, `GET /ai/analysis/{id}` |

Los tres `fetchBaseQuery` comparten el mismo `prepareHeaders` (`src/features/auth/authHeaders.ts`), que agrega `Authorization: Bearer <token>` cuando hay sesión.

`src/api/backend.ts` es un wrapper de axios que se conserva solo para llamadas puntuales fuera de RTK Query, por ejemplo `GET /health` en `BackendStatus` (toast de arranque que no renderiza markup).

La URL base de la API se resuelve en `src/utils/apiBaseUrl.ts`, que lee `process.env.NEXT_PUBLIC_API_URL`. Esa lectura **hoy no llega al navegador** (defecto `apiBaseUrl-never-inlined`): gana el fallback `http://localhost:3001/api`. Ver la sección del defecto en `docs/frontend-guide.md`.

**Contrato autoritativo**: `docs/backend-requirements.md`. No agregar endpoints que no existan en el backend real.

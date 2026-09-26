# Rutas y páginas del Frontend

Este documento describe las rutas expuestas por la aplicación Next.js (App Router, `src/app`) y la información que consume cada página. Todo el código vive en la raíz del repositorio: no existe un prefijo `frontend/`.

## Rutas implementadas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `src/app/page.tsx` | Página de inicio. Muestra el estado del backend (`HealthStatus`) y la lista de medidores (`MeterList`). |
| `/meters` | `src/app/meters/page.tsx` | Lista completa de medidores. Utiliza el componente `MeterList`. |
| `/meter/[id]` | `src/app/meter/[id]/page.tsx` | Detalle de un medidor específico. Renderiza `MeterDetail`. |
| `/meter/[id]/readings` | `src/app/meter/[id]/readings/page.tsx` | Lecturas del medidor con gráfico (`ReadingsChart`) y tabla (`ReadingsTable`). |
| `/dashboard` | `src/app/dashboard/page.tsx` | Resumen del dashboard y previsualización de anomalías. |
| `/anomalies` | `src/app/anomalies/page.tsx` | Lista completa de anomalías con filtros y ordenamiento en el navegador, más la acción **AI re-analysis** (`AiReanalysis`), que re-ejecuta el análisis del backend bajo demanda. Los filtros y el orden de severidad, prioridad y fecha corren en el navegador; el tipo solo se filtra, no se ordena. El orden que devuelve la API (prioridad ascendente) se describe en `docs/backend-requirements.md`, donde queda confirmado contra el código del backend. |
| `/anomalies/[id]` | `src/app/anomalies/[id]/page.tsx` | Vista de investigación de una anomalía (`AnomalyDetail`): `priority`, `baseline`, cambios con signo, `correlated_events` y `data_quality`. Un id desconocido renderiza un estado 404 dedicado: la página es un componente de cliente, así que no responde el código HTTP. |

## Rutas planificadas (no implementadas)

| Ruta | Estado | Motivo |
|------|--------|--------|
| `/settings` | Planificada | Preferencias del usuario; sin diseño final. |

**Nota**: la sección anterior lista únicamente rutas que todavía no tienen página. Las rutas implementadas consumen los endpoints reales del backend y no agregan ninguno que no exista.

## Wireframes / UI (breve)

- **Home**: barra superior, estado de salud (`HealthStatus`), lista de medidores (`MeterList`).
- **Meters**: título y lista de medidores con enlaces a detalle.
- **Meter Detail**: tabla con los campos poblados de `GET /meters/{meterId}` (`id`, `meter_id`, `status`, `created_at`, `readings_count`, `last_reading_at`); `name` y `location` llegan siempre vacíos y la tabla no los renderiza. La serie de consumo, voltaje, corriente y factor de potencia llega por `/readings`.
- **Meter Readings**: gráfico de la serie de consumo y tabla de lecturas, con selector de rango de fechas.
- **Dashboard**: resumen de métricas y tabla de anomalías con severidad.

## Datos requeridos por página

| Página | Endpoint(s) del backend | Datos usados |
|--------|--------------------------|--------------|
| Home (`/`) | `GET /health`, `GET /meters` | Estado del backend y lista de IDs de medidores. |
| Meters (`/meters`) | `GET /meters` | Array de IDs de medidores. |
| Meter Detail (`/meter/[id]`) | `GET /meters/{meterId}` | Metadatos reales del medidor: `id`, `meter_id`, `name` (siempre vacío), `location` (siempre vacío), `status` (`OK`/`DEGRADED`), `created_at`, `readings_count`, `last_reading_at`. Medidor desconocido → `404`. La serie numérica llega por `/readings`. |
| Meter Readings (`/meter/[id]/readings`) | `GET /meters/{meterId}/readings?from&to` | Array de lecturas con **nombres de campo Go**: `MeterID`, `Timestamp`, `Consumption`, `Voltage`, `Current`, `PowerFactor` y `status` opcional (`omitempty`; es el único campo re-etiquetado en minúscula, los otros seis conservan los nombres Go). `from`/`to` son RFC3339, opcionales e inclusivos. Medidor desconocido o ventana vacía → `200 null` (nunca 404). |
| Dashboard (`/dashboard`) | `GET /dashboard/summary`, `GET /anomalies` | Resumen (`health`, `meters`, `anomalies`, `lastRun`) y previsualización de anomalías (DTO `AnomalyDTO`: `id`, `meter_id`, `detected_at`, `type`, `severity`, `confidence`, `reason`, `recommended_action`, `status`, `priority`, `baseline` (`mean`, `stddev`, `count`, `voltage_mean`, `current_mean`, `power_factor_mean`), los cambios con signo `consumption_change_pct`, `voltage_change_pct`, `current_change_pct` y `power_factor_change_pct`, `correlated_events` (`id`, `type`, `start`, `end`, `description`) y `data_quality` (`flagged`, `reason`), más `llm_analysis` opcional). El array se muestra en el orden que devuelve la API (prioridad ascendente); ese orden está confirmado contra el código del backend en `docs/backend-requirements.md`. |
| Anomalies (`/anomalies`) | `GET /anomalies`, `GET /meters`, `POST /ai/analyze`, `GET /ai/analysis/{id}` | Array de anomalías (DTO `Anomaly`); el orden que devuelve la API (prioridad ascendente) está confirmado contra el código del backend en `docs/backend-requirements.md`. `GET /anomalies` no acepta parámetros de consulta: los filtros y el orden de severidad, prioridad y fecha corren en el navegador, y el tipo solo se filtra. `GET /meters` alimenta el filtro por medidor. La acción **AI re-analysis** dispara `POST /ai/analyze` (sin body) y, con el `analysisId` devuelto, consume `GET /ai/analysis/{id}`. El POST es **sincrónico**: re-ejecuta el pipeline determinista y luego la narrativa del LLM por anomalía, así que puede tardar alrededor de un minuto; la UI lo declara en pantalla y no implementa polling, porque todas las respuestas observadas hasta ahora traen `"status":"completed"`. El resultado es **aditivo**: la lista determinista de la página no se reemplaza ni se reordena, y no se refresca automáticamente (los slices de RTK Query no declaran tags de cache). |
| Anomaly Detail (`/anomalies/[id]`) | `GET /anomalies/{id}` | Objeto de anomalía completo: metadatos, `priority`, `baseline`, los cuatro cambios con signo, `correlated_events` y `data_quality`, más `llm_analysis` opcional. Id desconocido → `404`. |

## Capa de API (RTK Query)

Los endpoints se declaran en tres slices de RTK Query, todos registrados en `src/features/store/index.ts`:

| Slice | Archivo | Endpoints |
|-------|---------|-----------|
| `apiSlice` (reducerPath `api`) | `src/features/api/apiSlice.ts` | `GET /meters`, `GET /meters/{meterId}`, `GET /anomalies`, `GET /anomalies/{id}`, `GET /dashboard/summary` |
| `dataApi` | `src/features/data/dataAPI.ts` | `GET /meters/{meterId}/readings` (parámetros `from`, `to`) |
| `dashboardApi` | `src/features/dashboards/dashboardAPI.ts` | `POST /ai/analyze`, `GET /ai/analysis/{id}` |

`src/api/backend.ts` es un wrapper de axios que se conserva solo para llamadas puntuales fuera de RTK Query, por ejemplo `GET /health` en `HealthStatus`.

La URL base de la API se resuelve en `src/utils/apiBaseUrl.ts`, que lee `process.env.NEXT_PUBLIC_API_URL`.

**Contrato autoritativo**: `docs/backend-requirements.md`. No agregar endpoints que no existan en el backend real.

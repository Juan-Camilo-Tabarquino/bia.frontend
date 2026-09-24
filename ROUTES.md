# Rutas y páginas del Frontend

Este documento describe todas las rutas expuestas por la aplicación Next.js y la información que cada página consume.

## Rutas principales
| Ruta | Archivo / componente | Descripción |
|------|------------------------|-------------|
| `/` | `frontend/src/app/page.tsx` | Página de inicio. Muestra el estado del backend y la lista de medidores. |
| `/meters` | `frontend/src/app/meters/page.tsx` | Lista completa de medidores. Utiliza el componente `MeterList`. |
| `/meter/[id]` | `frontend/src/app/meter/[id]/page.tsx` | Detalle de un medidor específico. Renderiza `MeterDetail`. |
| `/dashboard` | `frontend/src/app/dashboard/page.tsx` | Dashboard de análisis de consumo y anomalías. Consume `/analysis` del backend y muestra componentes de visualización. |
| `/settings` *(por implementar)* | — | Página de configuración y preferencias del usuario. |

## Wireframes / UI (breve)
- **Home**: barra superior, estado de salud (`HealthStatus`), lista de medidores.
- **Meters**: título, lista de IDs con enlaces a detalle.
- **Meter Detail**: tabla de descripciones (consumo, voltaje, corriente, factor de potencia) y gráficas de lecturas.
- **Dashboard**: cards de métricas, tabla de anomalías, gráficos de series temporales.

## Datos requeridos por página
| Página | Endpoint(s) del backend | Datos usados |
|--------|--------------------------|--------------|
| Home | `GET /health`, `GET /meters` | Estado del backend, lista de medidores. |
| Meters | `GET /meters` | Array de objetos `{ id, name? }`. |
| Meter Detail | `GET /meter/:id/detail` | Detalle del medidor (consumo, voltaje, etc.). |
| Dashboard | `GET /analysis` | Resumen de análisis, anomalías, métricas agregadas. |

**Nota**: Los endpoints están implementados en `frontend/src/api/backend.ts`. Las rutas pueden ampliarse en el futuro (p. ej., `/reports`).

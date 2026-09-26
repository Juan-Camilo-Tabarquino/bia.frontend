# Plan del refactor de UI — estado y continuidad

Este documento es el **punto de entrada para retomar** el trabajo de `refactor/improve-ui`. Dice qué se
hizo, qué falta, con qué evidencia, y **qué reglas dejaron las fases anteriores** para no repetir errores.
El detalle exhaustivo, fase por fase, vive en `odd/tasks/refactor-improve-ui.md`; acá está el resumen
operativo.

> **Referencia de diseño: el producto de Bia.** La paleta y el lenguaje visual salieron de los assets
> reales de `bia.app` (su degradado de marca, sus clases Tailwind y las capturas de su producto), no de
> una decisión de gusto. Procedencia exacta de cada color en `odd/tasks/refactor-improve-ui.md`.

---

## Estado actual

| | |
| --- | --- |
| Rama | `refactor/improve-ui`, desde `main` (`ab85e7e8`) |
| Fases hechas | **0+1, 2, 3** (más el arreglo del tema) |
| Fases pendientes | **4, 5, 6** |
| Suite | **24 suites / 155 tests** (arrancó en 18/118) |
| Gates | `lint` 0 · `tsc --noEmit` 0 · `test` 155/155 · `next build` 0 (7 rutas) |
| Review nativo | **4 recibos, los 4 aprobados**, autoridad quemada. 12 advisories abiertos (abajo) |
| Decisiones fijadas | 3 destinos con `/meters` como entrada · **dark por defecto + toggle** · teal de Bia · health como **toast al arrancar** (sin polling ni chip) · **Inter** · `@ant-design/icons` permitido (solo componentes gratis de antd) |

## Fases hechas

| Fase | Commits | Qué quedó |
| --- | --- | --- |
| **0+1 — Identidad y fundación** | `7c64000b` (código) · `8a6bf2d4` (registro) | Capa de tokens + `ConfigProvider` (la app **no tenía theming**: corría en defaults), **dark por defecto con toggle real** persistido, Inter con `next/font`, shell completo (`Layout.Header/Content/Footer`, container de 1200 px, marca con rayo SVG + wordmark), navegación a **3 destinos en español** con iconos y `aria-current`, `/` → redirige a `/meters`, todos los literales de color a variables de antd, `reset.css` al layout raíz, `src/styles/variables.scss` eliminado |
| **2 — Shell** | `37b8cea8` (código) · `5081ee23` (registro) | Breadcrumb en español derivado del pathname (ids verbatim, path malformado no renderiza nada) y **badge con el conteo de anomalías** alimentado por el cache compartido del summary. También el `jest.config.js` arreglado en la causa en vez de parcheado |
| **Arreglo del tema** | `8c7c4982` | Bug real: **la preferencia de tema se perdía en cada recarga en desarrollo**. Ver abajo |
| **3 — Estados y feedback** | `4820b93f` | **Un solo vocabulario de error con "Reintentar"** (eran seis presentaciones sin salida), **toast de health al arrancar** (dispara exactamente una vez, sin polling), `Skeleton` y `Empty` donde había regiones en blanco, `"Actualizando…"` para que un refetch sea visible sin blanquear contenido, y las deprecaciones de antd 6 saneadas (`Spin tip`, `Descriptions children`). `HealthStatus.tsx` eliminado (estaba muerto) |

### Dos cosas que valen más que el código

**1. La regresión de SSR que la fase 0+1 casi manda.** Sin extracción de estilos en SSR, el servidor
enviaba el markup de antd **sin una sola línea de su CSS**: medido, **0 bloques `<style>`** y **0 reglas
`.ant-`** en los chunks emitidos, con las variables `--bia-*` sin definir (lo que descartaba en silencio el
`background` del `body`). Lo arregló `@ant-design/nextjs-registry`: hoy las páginas pre-renderizadas traen
**139+ reglas `.ant-`** y **definen** las variables. La alternativa sin dependencia se probó y se descartó:
`zeroRuntime` de antd 6 necesita `antd/dist/antd.css`, que tiene el prefijo `ant` cocido en 7.273
referencias `var()` sin definir nada, y pesa 1 MB.

**2. El bug del tema que la suite no vio.** La preferencia se perdía al recargar **en dev**: el efecto de
escritura persistía el default `"dark"` durante el montaje, antes de que se aplicara la lectura, y el doble
invoke de StrictMode lo escribía encima del `"light"` guardado. **La suite estaba verde (22 suites) con la
funcionalidad rota**, porque los tests del tema renderizaban sin `StrictMode` — o sea, probaban una app
distinta de la que corre.

---

## Reglas que dejan las fases anteriores

Estas no son sugerencias: son cosas que ya costaron un ciclo cada una.

1. **StrictMode.** Todo componente con efectos necesita su test renderizado **dentro de `<StrictMode>`**, y
   todo efecto nuevo tiene que ser StrictMode-safe. Next lo activa en dev, y dev es donde se evalúa esto.
   El guard del toast de health usa un `useRef` (un ref **sobrevive** el remount simulado; un flag de estado
   leído en el mismo efecto, no).
2. **Verificar el efecto, no la intención.** Cuando un guard o un cambio importa, pedí un **experimento de
   mutación**: sacar la protección, mostrar que el test **falla**, restaurar byte a byte con hash. Dos veces
   ya, eso distinguió un test que protege de uno que decora.
3. **Español incremental.** De la fase 3 en adelante, **todo componente que se toca nace en español**. La
   fase 6 barre solo lo que quede. Así se evita traducir dos veces lo que las fases 4-5 reescriban.
4. **Los textos propios de antd no están en el repo.** Su paginador, el panel del `DatePicker` y el "No data"
   de las tablas siguen en inglés y **ningún grep de strings propios los encuentra**: necesitan
   `ConfigProvider locale={esES}` + `dayjs/locale/es`. Ya se ve en producción: junto a nuestro
   "No hay lecturas en el rango seleccionado" la tabla muestra **"No data"**.
5. **`var()` no es confiable en atributos SVG** (`stroke`/`fill` de recharts): SVG2 los parsea como gramática
   de atributo, no como CSS (issue abierto del W3C, `svgwg#1031`). Los colores del chart salen de un mapa en
   TS, no de variables CSS.

## Fases pendientes

### Fase 4 — Interactividad

Lo que separa una tabla de datos de una aplicación.

- **Búsqueda** en medidores y anomalías (los arrays completos ya están en el cliente).
- **Orden en los headers de tabla** (`AnomalyTable` no ordena; hoy el orden vive en un `Select` externo).
- **Paginación consistente**: `AnomalyTable` renderiza **todas** las filas (`pagination={false}`) mientras
  `ReadingsTable` pagina de a 10.
- **Deep links de filtros**: `/anomalies` lee `meter_id` pero **nunca escribe** la URL, así que filtros y
  orden se pierden al refrescar y no se pueden compartir.
- **Cross-links medidor ↔ anomalía**: el detalle de anomalía muestra el `meter_id` como **texto**, no como link.
- **Fechas legibles**: hoy se muestran **RFC3339 crudos** en 6 lugares y en el eje X del chart.
- **KPI cards con pastilla de delta** y banner de insight: es la firma visual del producto de Bia
  (verde ↓ / rojo ↑ con el porcentaje, y una línea de contexto debajo).
- **Acá caen dos advisories**: `R3-retry-loading-flag` (pasar `retrying={isFetching}` en `MeterList` y en la
  página de anomalías) y `R3-breadcrumb-encoding` (los segmentos del pathname se usan crudos).

### Fase 5 — Chart

Teal como serie, **línea de referencia del baseline** (el `baseline.mean` por anomalía **existe** en el DTO,
aunque el código actual afirme que el backend no expone baseline), leyenda con swatches, grid suave, unidad
en el eje Y y tooltip tematizado — todo mirando su producto, que tiene exactamente eso.

### Fase 6 — Español restante

Los ~200 strings que quedan en inglés más `locale={esES}` + `dayjs/locale/es`, los cuatro mapas de labels
que **no existen** (`HIGH`/`MEDIUM`/`LOW`, `OK`/`DEGRADED`, y el label de 3 de los 4 tipos de anomalía),
formato localizado de fechas y números, y `lang="es"`.

---

## Advisories abiertos (12 + hallazgos del verificador)

Todos **no bloqueantes** y explícitamente **no** razón para re-revisar su candidato. Consolidados también
en memoria (`bia-frontend/refactor-improve-ui/review-advisories`).

| ID | Gravedad | Dónde | Qué |
| --- | --- | --- | --- |
| `R3-1` | WARNING | `theme-provider.tsx:41-58` | La zona de persistencia — **ya resuelto** por `8c7c4982` |
| `R3-2` | SUGGESTION | `SiteShell.tsx:28-30` | La composición del shell |
| `R3-3` | SUGGESTION | `SiteHeader.tsx:80-88` | El gating del badge |
| `R3-badge-guard` | WARNING | `SiteHeader.tsx:86-89` | El gating del badge (emparenta con `R3-3`) |
| `R3-breadcrumb-encoding` | SUGGESTION | `SiteBreadcrumb.tsx:70-72` | Segmentos del pathname crudos |
| `R3-shell-fetch-every-mount` | SUGGESTION | `SiteHeader.tsx:74-84` | El query del summary en el shell |
| `R3-theme-persist-effect` | WARNING | `theme-provider.tsx:69-77` | El `toggle` perdió el updater funcional |
| `R3-retry-loading-flag` | WARNING | `MeterList.tsx:28-38` | `retrying` no se pasa (lo marcaron **la lente y el verificador por separado**) |
| `R3-chart-empty-coverage` | SUGGESTION | `ReadingsChart.tsx:200-205` | Cobertura del empty state nuevo |
| `R3-backend-status-unmount-safety` | SUGGESTION | `BackendStatus.tsx:35-52` | Seguridad del toast ante un desmontaje |
| `R3-request-error-shared-id` | SUGGESTION | `RequestError.tsx:33-44` | Id compartido dentro del vocabulario de error |
| `R3-theme-toggle-stale-closure` | WARNING | `theme-provider.tsx:98-100` | El `toggle` lee `mode` del closure en vez de usar un updater funcional, así que dos toggles en el mismo tick netean un solo giro |

Además, del verificador y sin advisory asociado: el skeleton de `ReadingsTable` es de párrafo para una tabla
de 6 columnas (se contradice con su propio comentario); los 404 hermanos no coinciden de idioma
("Medidor no encontrado" vs "Anomaly not found"); y el vocabulario de error es de página, con dos
supervivientes defendibles (el warning secundario del filtro de medidores y el `Alert` de fallo del
re-análisis con IA).

---

## Cómo retomar

```bash
git switch refactor/improve-ui
npm install
npm run lint && npx tsc --noEmit && npm test && npx next build   # los cuatro gates por fase
npm run dev                                                      # y mirar la app
```

**Ciclo por fase** (es el que se usó en las tres anteriores): delegar la escritura a un worker acotado con
sugerencias exactas → **verificación independiente** con el mandato de *falsificar*, no de confirmar →
commit del work unit → **preflight de review nativo** (`inspect` → `start` → `status` → `capture` →
`capture` con acknowledgement → `acknowledge-approved`) → commit del registro ODD.

**Para verificar en navegador** (lo que jsdom no puede dar): hay un Chromium headless instalado vía
Playwright en `node_modules` (instalado con `--no-save`, así que `package.json` está intacto). Se usa
`npx playwright install chromium` y un script que abre la app contra `next dev` — **en dev, no en
`next start`**, porque React solo loguea los warnings de hidratación en desarrollo. Instrumentar
`Storage.prototype.getItem/setItem` por `addInitScript` fue lo que reveló el bug del tema.

### Cosas del ciclo de review que conviene saber de antemano

- **El disparador de `executable_change` es `jest.config.js`**, no un archivo de código: apareció en los
  cuatro candidatos. Un candidato de pura documentación se auto-cierra como `low`/`non_executable_only`.
- **El controller proyecta contra `main`**, así que el diff revisado es la **rama acumulada**, no el último
  commit (fue de 29 a 51 rutas). Cada commit nuevo agranda el candidato.
- **Commitear supersede el target de un recordatorio**, porque la identidad se deriva del árbol. Pasó una
  vez y ese target no se llegó a revisar.
- **Un payload de revisor puede ser rechazado en la admisión** por una inconsistencia interna
  (`pi-host-relay-transport-failure` / `submission-refused`): en el caso real la lente produjo hallazgos y
  puso `inspection.status: "completed"`, pero su `evidence` decía que no había podido inspeccionar el
  candidato — y en ese caso hay que declarar `"unavailable"` con una razón. **El rechazo no consume el
  slot**, el payload queda en `.git/gentle-ai/rejected-results/<linaje>/`, y la recuperación es **relanzar la
  lente sobre el mismo linaje**: funcionó. Nunca reenviar los bytes rechazados.

## Pregunta abierta

Un warning de hidratación reportado por el dueño (*"attributes of the server rendered HTML didn't match"*)
**no se pudo reproducir** en un Chromium limpio contra su propio dev server, en 6 rutas, en modo dev. El
theme provider está verificado limpio en ese eje (`data-theme` y `colorScheme` se escriben solo en un efecto
pasivo, post-hidratación). La causa típica de esa firma exacta —atributos, sin diferencia de contenido— es una
**extensión del navegador** inyectando atributos en `<body>` antes de hidratar. Falta el texto completo del
error o una prueba en incógnito para cerrarlo.

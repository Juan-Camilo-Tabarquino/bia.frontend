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
| Fases hechas | **0+1, 2, 3, 4, 5 y 6** (más el arreglo del tema) |
| Fases pendientes | **Ninguna.** El refactor está cerrado; lo que queda es la decisión de merge a `main` |
| Suite | **32 suites / 279 tests** en `55399056` (arrancó en 18/118, y era 24/155 al cerrar la fase 3) |
| Gates | `lint` 0 · `tsc --noEmit` 0 · `test` 279/279 · `next build` 0 (8 rutas) en `55399056` |
| Review nativo | Último estado **registrado** (fase 3): **4 recibos, los 4 aprobados**, autoridad quemada. Las fases 4 y 5 se cerraron con **verificación independiente** (`gentle-ai-verify`, PASS WITH FINDINGS) registrada en sus propios ODD; **si cada una tiene un recibo de review nativo no se puede leer de los documentos → desconocido**. La fase 6 tiene recibo propio: **APROBADA** (lineage `review-ea04c99651f669cf`), autoridad quemada, 3 advisories no bloqueantes |
| Decisiones fijadas | 3 destinos con `/meters` como entrada · **dark por defecto + toggle** · teal de Bia · health como **toast al arrancar** (sin polling ni chip) · **Inter** · `@ant-design/icons` permitido (solo componentes gratis de antd) |

## Fases hechas

| Fase | Commits | Qué quedó |
| --- | --- | --- |
| **0+1 — Identidad y fundación** | `7c64000b` (código) · `8a6bf2d4` (registro) | Capa de tokens + `ConfigProvider` (la app **no tenía theming**: corría en defaults), **dark por defecto con toggle real** persistido, Inter con `next/font`, shell completo (`Layout.Header/Content/Footer`, container de 1200 px, marca con rayo SVG + wordmark), navegación a **3 destinos en español** con iconos y `aria-current`, `/` → redirige a `/meters`, todos los literales de color a variables de antd, `reset.css` al layout raíz, `src/styles/variables.scss` eliminado |
| **2 — Shell** | `37b8cea8` (código) · `5081ee23` (registro) | Breadcrumb en español derivado del pathname (ids verbatim, path malformado no renderiza nada) y **badge con el conteo de anomalías** alimentado por el cache compartido del summary. También el `jest.config.js` arreglado en la causa en vez de parcheado |
| **Arreglo del tema** | `8c7c4982` | Bug real: **la preferencia de tema se perdía en cada recarga en desarrollo**. Ver abajo |
| **3 — Estados y feedback** | `4820b93f` | **Un solo vocabulario de error con "Reintentar"** (eran seis presentaciones sin salida), **toast de health al arrancar** (dispara exactamente una vez, sin polling), `Skeleton` y `Empty` donde había regiones en blanco, `"Actualizando…"` para que un refetch sea visible sin blanquear contenido, y las deprecaciones de antd 6 saneadas (`Spin tip`, `Descriptions children`). `HealthStatus.tsx` eliminado (estaba muerto) |
| **4 — Interactividad** | `62dceaa6` … `026794d1` (T1–T8 + verificación) · registro `64c069bc` · `1147bc71` · `d3f5ca19` | Búsqueda con debounce en medidores y anomalías (con el gate que la limpieza necesitaba), orden desde los headers con un registro único, paginación consistente, **deep links de filtros y orden** por URL, cross-links medidor ↔ anomalía, fechas por un formateador único, **KPI con pastilla de delta** y banner de insight. Cierra `R3-retry-loading-flag` y `R3-breadcrumb-encoding` |
| **5 — Chart** | `a845fc24` (código + registro en el mismo commit) | **Línea de referencia del baseline** (el `baseline.mean` existía en el DTO y el mapeo lo descartaba; la línea se dibuja solo en Consumo y en las otras señales hay un `role="note"` que lo explica), leyenda con swatches, grid suave, unidad en el eje Y y tooltip tematizado. Los tres mocks inline de recharts se unificaron en `src/test-support/rechartsMock.ts` |
| **6 — Español** | `55399056` (implementación) · registro `a07a1c16` | App traducida al español y antd con `locale={esES}` + `dayjs.locale("es")`; los cuatro mapas de labels que faltaban. Gates: 32 suites / 279 tests, los cuatro en 0. Review nativo **APROBADO** (lineage `review-ea04c99651f669cf`), autoridad quemada, 3 advisories no bloqueantes |

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

**Ninguna.** Las fases 0+1 a 6 están hechas, comiteadas, pusheadas y (la 6) con review nativo aprobado.

### El refactor está cerrado — queda la decisión de merge

- **Merge a `main`**: es tuya, no del flujo de trabajo. `refactor/improve-ui` está 25 commits adelante de `main`.
- **El review de la rama acumulada ya no es posible.** El primer `START` falló con `lens_context_budget_exceeded`
  sobre el candidato por defecto (`main` → rama: 86 paths, fases 3 a 6). No se creó autoridad y nada quedó que
  reparar; revisar la fase 6 sola necesitó `baseRef` en la punta de la fase 5 y bajó a 38 paths. Cualquier fase
  que se agregue de acá en adelante necesita su propia rebanada revisada.
- **Registro**: `odd/tasks/refactor-improve-ui-phase-6.md`, ya comiteado (`a07a1c16`). El export de sesión
  `docs/01a0decd-bia-frontend-2026-09-26.jsonl` quedó fuera del inventario vía `.git/info/exclude` (local, nunca
  comiteado), no como parte del entregable.
- **Deuda arrastrada**: `T-SUITE` (~2.3 s/test contra el default de 5 s de Jest); ni confirmada ni refutada.
- **Config del entorno que hubo que arreglar** (no es de este repo): `~/.pi/gentle-ai/models.json` no tenía ninguna
  entrada, y **no hay modelo ambiente de fallback** por diseño, así que el relay de la lente se rehusó con
  `reviewer-config-invalid` antes de correr nada. Se configuraron las seis claves: las cuatro lentes más
  `review-refuter` y `review-validator`.

## Alcance original de las fases 4 y 5 (ya hechas — se conserva como historia)

Las descripciones de abajo son el alcance tal como se planificó, **no** el estado actual. Ambas fases se
completaron y verificaron, y su detalle real vive en `odd/tasks/refactor-improve-ui-phase-4.md` y
`odd/tasks/refactor-improve-ui-phase-5.md`.

### Fase 4 — Interactividad (hecha)

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
  página de anomalías) y `R3-breadcrumb-encoding` (los segmentos del pathname se usan crudos). **Ambos
  cerrados en la fase 4.**

### Fase 5 — Chart (hecha)

Teal como serie, **línea de referencia del baseline** (el `baseline.mean` por anomalía **existe** en el DTO,
aunque el código actual afirme que el backend no expone baseline), leyenda con swatches, grid suave, unidad
en el eje Y y tooltip tematizado — todo mirando su producto, que tiene exactamente eso.

---

## Advisories (18 registrados: 12 de la fase 3 + 3 de la fase 6 + 3 del review nativo, más hallazgos del verificador)

Todos **no bloqueantes** y explícitamente **no** razón para re-revisar su candidato. De los 12 de la fase 3,
**3 ya están resueltos** (`R3-1` por `8c7c4982`, y `R3-retry-loading-flag` + `R3-breadcrumb-encoding` en la
fase 4); el resto sigue abierto. Consolidados también en memoria
(`bia-frontend/refactor-improve-ui/review-advisories`).

| ID | Gravedad | Dónde | Qué |
| --- | --- | --- | --- |
| `R3-1` | WARNING | `theme-provider.tsx:41-58` | La zona de persistencia — **ya resuelto** por `8c7c4982` |
| `R3-2` | SUGGESTION | `SiteShell.tsx:28-30` | La composición del shell |
| `R3-3` | SUGGESTION | `SiteHeader.tsx:80-88` | El gating del badge |
| `R3-badge-guard` | WARNING | `SiteHeader.tsx:86-89` | El gating del badge (emparenta con `R3-3`) |
| `R3-breadcrumb-encoding` | SUGGESTION | `src/components/shell/SiteBreadcrumb.tsx:43-44` | Segmentos del pathname crudos — **RESUELTO en la fase 4 (T8)**: el label se decodifica y el `href` se re-encoda, con guard de `URIError` |
| `R3-shell-fetch-every-mount` | SUGGESTION | `SiteHeader.tsx:74-84` | El query del summary en el shell |
| `R3-theme-persist-effect` | WARNING | `theme-provider.tsx:69-77` | El `toggle` perdió el updater funcional |
| `R3-retry-loading-flag` | WARNING | `MeterList.tsx` / `anomalies/page.tsx` | `retrying` no se pasa (lo marcaron **la lente y el verificador por separado**) — **RESUELTO en la fase 4**: `retrying={isFetching}` en `src/components/MeterList.tsx:67` y `src/app/anomalies/page.tsx:116` |
| `R3-chart-empty-coverage` | SUGGESTION | `ReadingsChart.tsx:200-205` | Cobertura del empty state nuevo |
| `R3-backend-status-unmount-safety` | SUGGESTION | `BackendStatus.tsx:35-52` | Seguridad del toast ante un desmontaje |
| `R3-request-error-shared-id` | SUGGESTION | `RequestError.tsx:33-44` | Id compartido dentro del vocabulario de error |
| `R3-theme-toggle-stale-closure` | WARNING | `theme-provider.tsx:98-100` | El `toggle` lee `mode` del closure en vez de usar un updater funcional, así que dos toggles en el mismo tick netean un solo giro |
| `status-column-raw-value` | SUGGESTION | `AnomalyTable.tsx:262-265` | La columna **Estado** rinde solo el label, mientras las columnas vecinas muestran el valor crudo al lado. Comportamiento **pre-existente**, que la fase 6 no introdujo. Texto completo en `odd/tasks/refactor-improve-ui-phase-6.md` |
| `pagination-nesting-spy-order` | SUGGESTION | `src/components/__tests__/paginationLabels.test.tsx` | El spy de `console.error` para `validateDOMNesting` está acoplado al orden de render. Texto completo en `odd/tasks/refactor-improve-ui-phase-6.md` |
| `pagination-two-tooltips` | SUGGESTION | `src/components/paginationLabels.tsx` | El botón clonado lleva `title` español y el `<li>` conserva el suyo; nunca se midió con un hover real. Texto completo en `odd/tasks/refactor-improve-ui-phase-6.md` |
| `R3-dashboard-health-raw-value` | SUGGESTION | `src/app/dashboard/page.tsx:195` | Del review nativo (lente `review-reliability`), informativo. Ninguno de los tres abrió corrección. **El texto del claim no se conserva en ningún lado legible**: el recibo está quemado y el registro de consumo terminal guarda solo hashes. Fila con id, lente, ubicación, severidad y disposición, sin parafrasear |
| `R3-detail-severity-label` | SUGGESTION | `src/components/anomalies/__tests__/anomalyLabels.test.tsx:71-84` | Misma procedencia y misma limitación: `review-reliability`, informativo, claim no conservado |
| `R3-pagination-wiring` | SUGGESTION | `src/components/__tests__/paginationLabels.test.tsx:35-41` | Misma procedencia y misma limitación: `review-reliability`, informativo, claim no conservado |

**Resuelto en la fase 4, aunque no tuviera advisory propio:** los dos controles de limpieza de `/anomalies` ya
no comparten nombre accesible — `Limpiar filtros` en la barra de filtros
(`src/components/anomalies/AnomalyFilters.tsx:283`) y `Quitar filtros` en el empty state
(`src/app/anomalies/page.tsx:182`). Era un hallazgo del propio T2b de la fase 4.

Del verificador y sin advisory asociado, sigue **abierto**: el skeleton de `ReadingsTable` es de párrafo para
una tabla de 6 columnas (se contradice con su propio comentario), y el vocabulario de error es de página, con
dos supervivientes defendibles (el warning secundario del filtro de medidores y el `Alert` de fallo del
re-análisis con IA). **Resuelto por la fase 6:** los 404 hermanos ya coinciden de idioma — `Medidor no
encontrado` (`src/components/MeterDetail.tsx:47`) y `Anomalía no encontrada`
(`src/app/anomalies/[id]/page.tsx:54`).

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

## Trabajo posterior al refactor: `/meters` en cards

**Hecho, verificado en navegador, comiteado (`cb0cec3` código, `9f5ef7f` registro) y con review nativo APROBADO**
(lineage `review-b78b90f368a5ca5c`, autoridad quemada). Detalle completo en `odd/tasks/meters-cards.md`. La lista
de medidores dejó de ser filas de `Listy` (que **no** era una tabla, contra la premisa del pedido) y pasó a un grid
de cards de antd cliqueables, con `id + estado + última lectura`.

Lo que importa si se retoma:

- **La card clicleable es un stretched link**, no un `div onClick` ni un `<a>` que envuelva la card: así el nombre
  accesible del link sigue siendo exactamente el id, que es el contrato que `accessibility.test.tsx` fija y la
  razón por la que la fase 4 no le puso `aria-label`. Click real medido **fuera** del texto del link, dentro del
  padding de la card: navega. Tab: **un solo stop por card**, con anillo de foco visible en `--bia-color-primary`.
- **La queja original de "cortada" quedó refutada con números**: el grid mide `1152` dentro de un contenedor de
  `1200` (24 px de padding por lado), 4 filas, `documentElement` sin overflow horizontal, y ningún elemento
  recortado. La causa estructural que encontré — el `Space` externo `inline-flex` sin `width` — quedó superada por
  el layout, y el grid lo llena.
- **El detalle es un request por card** (`GET /api/meters` solo devuelve ids, no hay endpoint de lista con datos),
  y sigue al conjunto **visible**: filtrar 102 ids a 2 cuesta 2 requests, probado por mutación. **El review nativo
  lo marcó igual como `R3-nplus1-load`, severidad WARNING** — la más alta que recibió un hallazgo en esta rama, y
  la lente lo graduó por encima de lo que la conversación había asumido. Queda como deuda conocida, no como
  sorpresa.

## Dos defectos encontrados al verificar esto, ninguno causado por el cambio

No se arreglaron: quedan fuera del cambio autorizado y en esta rama cada cambio necesita su propia rebanada de review.

| ID | Gravedad | Dónde | Qué |
| --- | --- | --- | --- |
| `apiBaseUrl-never-inlined` | **WARNING** | `src/utils/apiBaseUrl.ts` | `NEXT_PUBLIC_API_URL` **nunca llega al navegador**. El archivo lee `process?.env?.NEXT_PUBLIC_API_URL`, y Next solo inlinea la referencia estática `process.env.NEXT_PUBLIC_X`: sus propios docs declaran que un lookup dinámico (su ejemplo es `const env = process.env; env.NEXT_PUBLIC_X`) **no** se inlinea. Probado en el bundle emitido: `.next/static/chunks/2zp1jrsfcykn6.js` conserva el literal sin reemplazar. En el browser `process` es `undefined`, el encadenamiento opcional corta, y **gana siempre el fallback hardcodeado `http://localhost:3001/api`**. Impacto: el cliente de la app desplegada no se puede apuntar a otra API. Fue lo que obligó al verificador a redirigir `localhost:3001` en la capa CDP para llegar a su stand-in |
| `meter-detail-h1-encoded` | SUGGESTION | `src/app/meter/[id]/page.tsx` | El `h1` del detalle muestra el segmento crudo de la ruta: `/meter/M%20109%2FA` renderiza `Medidor M%20109%2FA` mientras la API reporta el id como `M 109/A`. Comportamiento **pre-existente** de `useParams`, de la misma clase que arregló la fase 4 para los labels del breadcrumb |

## Pregunta abierta

Un warning de hidratación reportado por el dueño (*"attributes of the server rendered HTML didn't match"*)
**no se pudo reproducir** en un Chromium limpio contra su propio dev server, en 6 rutas, en modo dev. El
theme provider está verificado limpio en ese eje (`data-theme` y `colorScheme` se escriben solo en un efecto
pasivo, post-hidratación). La causa típica de esa firma exacta —atributos, sin diferencia de contenido— es una
**extensión del navegador** inyectando atributos en `<body>` antes de hidratar. Falta el texto completo del
error o una prueba en incógnito para cerrarlo.

# Guía del frontend

Esta guía explica **cómo funciona** el frontend de `bia.frontend`: la arquitectura, el flujo de datos, qué
muestra cada página, los estados que renderiza, las convenciones del repositorio y los problemas abiertos.

Es intencionalmente **complementaria** y no duplica a:

- [`docs/routes.md`](routes.md) — el mapa mecánico ruta → endpoints.
- [`docs/project-structure.md`](project-structure.md) — las carpetas y su responsabilidad.
- [`docs/backend-requirements.md`](backend-requirements.md) — **el contrato autoritativo de la API**. Esta guía no
  repite las formas de respuesta; cuando necesita un endpoint lo nombra y remite al contrato.

> **Regla de este documento:** no afirma nada que no esté verificado en el código. Cuando un dato viene de una
> medición registrada (una ejecución previa, un bundle emitido, un navegador real) y no de la lectura de un archivo,
> lo dice explícitamente. El estado del refactor y los recibos de review viven en
> [`docs/ui-refactor-plan.md`](ui-refactor-plan.md).

---

## 1. Qué es y cómo se ejecuta

**Qué es.** El cliente web de la plataforma BIA de gestión energética: monitoreo de medidores, lecturas por medidor
y resúmenes de dashboard, sobre la API REST de `bia.backend`. Todo el código vive en la raíz del repositorio; **no
existe un prefijo `frontend/`, ni Vite, ni React Router**.

**Stack (versiones reales de `package.json`).**

| Pieza | Paquete | Versión declarada |
| --- | --- | --- |
| Framework | `next` (App Router, Turbopack) | `16.3.6` |
| UI | `react` / `react-dom` | `19.2.8` |
| Lenguaje | `typescript` | `^5` |
| Estado y datos | `@reduxjs/toolkit` (RTK Query) | `^2.12.0` |
| Componentes | `antd` | `^6.6.5` |
| Iconos | `@ant-design/icons` | `^6.3.4` |
| Extracción de CSS de antd en SSR | `@ant-design/nextjs-registry` | `^1.3.0` |
| Gráficos | `recharts` | `^3.10.1` |
| HTTP puntual | `axios` | `^1.20.0` |
| Fechas | `dayjs` | `^1.11.10` |
| Markdown (narrativa LLM) | `react-markdown` + `remark-gfm` | `^10.1.0` / `^4.0.1` |
| Estilos | `sass` | `^1.105.0` |
| Tests | `jest` + `@testing-library/react` | `^30.5.2` / `^16.3.3` |

**Scripts (`package.json`).**

| Script | Comando | Para qué |
| --- | --- | --- |
| `npm run dev` | `next dev` | Servidor de desarrollo (Turbopack) en `http://localhost:3000` |
| `npm run build` | `next build` | Build de producción |
| `npm start` | `next start` | Servir el build de producción |
| `npm run lint` | `eslint .` | Lint |
| `npm test` | `jest` | La suite de tests |

**Requisitos.**

- **Node.js 20**, la versión que corre CI. Nota: `@testing-library/jest-dom@7` declara `engines.node >= 22`
  (verificado en su `package.json`) mientras el repositorio **no declara** un campo `engines` propio, así que en
  Node 20 `npm install` imprime un warning de engine en vez de fallar.
- Una instancia de `bia.backend` accesible en la API REST.

**Cómo se ejecuta.**

```bash
npm install
npm run dev
```

Abrí **`http://localhost:3000`** en el navegador (ver la trampa del entorno en la sección 2).

**Nota de entorno.** La URL base de la API se resuelve en un solo lugar, `src/utils/apiBaseUrl.ts`, que lee
`NEXT_PUBLIC_API_URL` y cae a `http://localhost:3001/api`. Esa lectura **hoy no llega al navegador**, así que
`NEXT_PUBLIC_API_URL` no tiene efecto del lado cliente y el fallback siempre gana. El repositorio **sí** trae un
`.env.example` versionado que documenta `NEXT_PUBLIC_API_URL` (la única variable de entorno que lee el cliente) y
repite ese caveat. Está documentado como defecto en la sección 4.

---

## 2. La trampa del entorno, arriba y visible

> **La app solo hidrata en `http://localhost:3000`.**

En `http://127.0.0.1:3000` el WebSocket de HMR del dev server de Next 16 falla
(`ERR_INVALID_HTTP_RESPONSE`) y la página **nunca hidrata**. El síntoma parece un bug de la aplicación:

- no hay claves `__reactFiber$` ni renderer registrado,
- el botón de tema queda inerte,
- **no se dispara ninguna llamada a `/api`**,
- y por eso `/anomalies` se queda en el `Skeleton` del SSR, **sin `h1`**.

**Esto es del host, no de la app.** Se reprodujo en el servidor del dueño **y** en una copia aislada, y quedó
registrado como el advisory `dev-127-does-not-hydrate` (WARNING, *environment, not the app*) en
[`odd/tasks/breadcrumb-gutter.md`](../odd/tasks/breadcrumb-gutter.md). El mecanismo exacto de Next **no está
probado**: solo la correlación observada. Medí siempre contra `localhost`.

---

## 3. Arquitectura y flujo de datos

### App Router y cadena de providers

Las rutas viven en `src/app` (App Router). El layout raíz (`src/app/layout.tsx`) es un componente de servidor que
renderiza:

```
<html lang="es" class="<inter.variable> bia-theme">
  <body>
    <AntdRegistry>          ← @ant-design/nextjs-registry: extrae el CSS-in-JS de antd en SSR
      <Providers>           ← "use client"
        <SiteShell>         ← "use client"
          {children}        ← la página de la ruta
        </SiteShell>
      </Providers>
    </AntdRegistry>
  </body>
</html>
```

- `AntdRegistry` es lo que hace que el servidor envíe el markup de antd **con** su hoja de estilos. Sin él, el
  primer pintado sale sin estilos y las variables `--bia-*` quedan sin definir. Es una medición registrada de la
  fase 0+1 ([`docs/ui-refactor-plan.md`](ui-refactor-plan.md)).
- `Providers` (`src/app/providers.tsx`) compone, de afuera hacia adentro: `<Provider store>` (Redux) →
  `<ConfigProvider locale={esES}>` → `<ThemeProvider>` → `<AntdApp>`. El `ConfigProvider` con el locale es
  **externo** para que el `ConfigProvider` del theme provider herede el locale en vez de reimportarlo.
- `dayjs.locale("es")` se ejecuta a **scope de módulo** en ese mismo archivo cliente (ver sección 6).

### El shell

`SiteShell` (`src/components/shell/SiteShell.tsx`) monta, en orden:

1. `BackendStatus` — toast de salud del backend. Monta una sola vez y **no renderiza markup**.
2. `SiteHeader` — marca "Bia", navegación de tres destinos **Medidores** (`/meters`), **Análisis** (`/dashboard`) y
   **Anomalías** (`/anomalies`) con iconos y `aria-current`, badge opcional con el conteo de anomalías, el nombre
   del usuario con su control de cierre de sesión, y el toggle de tema. El `aria-label` de la nav es
   `Navegación principal`.
3. `SiteBreadcrumb` — rastro derivado del pathname; el `aria-label` del landmark es `Ruta de navegación`. Un path
   que la app no reconoce no renderiza nada (mejor sin breadcrumb que con uno engañoso).
4. `Content` con la clase compartida `shell-container`, que envuelve a los hijos en `PrivateRoute` (la guardia de
   autenticación).
5. `Footer` con el texto `Bia · <año>`.

En `/login` el shell **no** monta la barra superior ni el breadcrumb: es la única ruta sin chrome.

### Los tres slices de RTK Query

Toda la data del servidor pasa por RTK Query. Los tres slices se registran en `src/features/store/index.ts`:

| Slice | Archivo | `reducerPath` | Endpoints |
| --- | --- | --- | --- |
| `apiSlice` | `src/features/api/apiSlice.ts` | `api` (default) | `getMeters` `GET /meters`, `getMeterDetail` `GET /meters/{meterId}`, `getAnomalies` `GET /anomalies`, `getAnomalyById` `GET /anomalies/{id}`, `getDashboardSummary` `GET /dashboard/summary` |
| `dataApi` | `src/features/data/dataAPI.ts` | `dataApi` | `getMeterReadings` `GET /meters/{meterId}/readings?from&to` |
| `dashboardApi` | `src/features/dashboards/dashboardAPI.ts` | `dashboardApi` | `postAnalyze` `POST /ai/analyze`, `getAiAnalysis` `GET /ai/analysis/{id}` |

### El wrapper de axios fuera de RTK Query

`src/api/backend.ts` es una instancia de `axios` conservada para llamadas puntuales. Hoy tiene **una sola**
función, `getHealth()`, que consume `BackendStatus` para el toast de arranque. No es el único camino a la API: la
mayoría del tráfico va por los tres slices.

### Caching que un lector va a observar

**En el repositorio no se declara ningún tag de cache**: no hay `tagTypes`, `providesTags` ni `invalidatesTags` en
ningún slice (verificado por grep en `src/`). Tampoco hay un `keepUnusedDataFor` propio, así que aplica **el default
de RTK Query**, que es el que gobierna cuándo se descarta una entrada sin suscriptores.

Consecuencia práctica: el cache **no se invalida entre sí**. El conteo de anomalías del header se lee de una sola
entrada (`GET /dashboard/summary`) y **nunca se invalida**, así que puede quedar viejo durante toda la sesión. El
header **depende deliberadamente** de que el shell nunca se desmonte entre rutas: como la suscripción al summary no
se corta, la entrada no se descarta y `/dashboard` la reutiliza en vez de pedirla de nuevo. Es una limitación real,
no un accidente, y es consistente con la decisión del dueño de **no hacer polling** — la única excepción es el
análisis con IA **por medidor** de `/meter/[id]`, que poléa **por suscripción** y solo refresca su propia entrada
(`GET /ai/analysis/{id}`) mientras el run esté `queued` o `running`; no invalida ninguna otra.

### Autenticación: la guardia es de flujo, no de seguridad

`src/components/PrivateRoute.tsx` es la guardia real: sin sesión válida redirige a `/login`; con sesión, renderiza
sus hijos. **Omite `/login`**, así que montarla sobre el shell entero no puede producir un bucle de redirección.

Se monta **una sola vez, en `SiteShell`**, para cubrir todas las rutas del demo. La razón es explícita: las páginas
de la suite se renderizan directamente en los tests y nunca montan el shell, de modo que una guardia a nivel de
página rompería muchas suites sin ningún beneficio de producto.

**Dónde vive el token.** `src/features/auth/session.ts` guarda el JWT en `localStorage` bajo la clave versionada
`bia.session.v1`. El payload (`sub`, `name`, `authorized`, `exp`) se decodifica a mano desde el segmento `base64url`;
un token ausente, mal formado o **vencido** se trata como *sin sesión*, y todo acceso a `localStorage` está envuelto
en `try/catch` porque los modos privados lanzan. `useSession()` expone `{ session, ready, signOut }` y `ready`
distingue "no hay sesión" de "todavía no se leyó el almacenamiento" (el render del servidor siempre es
`ready: false`).

**Es un flujo de UX, no una frontera de seguridad.** El backend **solo emite** el JWT en `POST /api/auth/login` y
**no lo valida en ninguna otra ruta** (decisión de alcance de esta demo). Por eso la guardia solo mantiene fuera de
las pantallas del demo a quien no inició sesión, y **no hay interceptor de respuestas**: no existe un `401` de token
vencido que manejar. `src/features/auth/authHeaders.ts` es el único `prepareHeaders`, compartido por los tres slices
(`apiSlice`, `dataApi`, `dashboardApi`), que agrega `Authorization: Bearer <token>` cuando hay sesión.

`/login` oculta la barra superior, la navegación y el breadcrumb (condicional del propio shell) para quedar limpio, y
muestra las credenciales de demostración (`jcamilo` / `bia2026`) porque es un demo de flujo. La cabecera muestra el
nombre del usuario y un control de cierre de sesión que borra la sesión y vuelve a `/login`.

---

## 4. El defecto de la URL de la API — documentado como defecto, no como característica

`src/utils/apiBaseUrl.ts` línea 4 lee:

```ts
if (typeof process !== "undefined" && process?.env?.NEXT_PUBLIC_API_URL) {
```

Es la forma **dinámica con encadenamiento opcional**. Next solo inlinea la expresión **estática**
`process.env.NEXT_PUBLIC_X`; una búsqueda dinámica no se inlinea (lo declaran los propios docs de Next). En el
navegador `process` no existe, el encadenamiento opcional corta, y **gana siempre el fallback hardcodeado**
`http://localhost:3001/api`.

**Por lo tanto: setear `NEXT_PUBLIC_API_URL` hoy no tiene efecto en el navegador.** El repositorio trae un
`.env.example` versionado que documenta la variable y este mismo caveat: es un registro de la variable, no un
override funcional (el `.env.local` local no se versiona).

Se probó sobre el bundle emitido: el chunk `.next/static/chunks/2zp1jrsfcykn6.js` conserva el literal sin
reemplazar (medición registrada, no de esta guía). Queda como el **WARNING abierto `apiBaseUrl-never-inlined`**;
impacto: el cliente de la app desplegada no se puede apuntar a otra API.

**No se arregla acá.** Está documentado como defecto.

---

## 5. La fundación visual

### El scope de tokens `--bia-*`

`src/theme/tokens.ts` exporta `CSS_VAR_SCOPE_CLASS = "bia-theme"` y define los dos temas con
`cssVar: { prefix: "bia", key: CSS_VAR_SCOPE_CLASS }`. La clase se pone en **`<html>`** (layout raíz), lo que deja
disponibles las variables `--bia-*` para todo el árbol, incluido `body` (que está por encima del shell). Los
módulos SCSS **leen esas variables** en lugar de repetir colores.

- **Dark por defecto, con toggle a light persistido.** La preferencia se guarda en `localStorage` bajo la clave
  `bia-theme`. El modo dark es el default **en servidor y en el primer render del cliente** para que la hidratación
  coincida; la preferencia guardada se lee **después del montaje** (efecto de una sola vez), porque el servidor no
  tiene `localStorage`. La escritura ocurre en las acciones del usuario, no en un efecto keyed por `[mode]`: un
  efecto de persistencia también corre en el commit de montaje, con el default `"dark"`, y el doble invoke de
  StrictMode lo escribía encima de un `"light"` guardado (bug real corregido; ver `docs/ui-refactor-plan.md`).
- **Inter** llega por `next/font` y se expone como la variable CSS `--font-inter`; los tokens la usan como primera
  familia.
- **`.shell-container`** es el gutter compartido: `width: 100%`, `max-width: 1200px`, `margin-inline: auto`,
  `padding-inline: 1.5rem` (24 px por lado).

### Los colores de los gráficos no son variables CSS

`src/theme/tokens.ts` exporta además `chartColors`, un mapa en TypeScript con un juego de valores por modo. Los
colores del chart salen de ahí, **no de `var()`**, porque los atributos de presentación SVG (`stroke`/`fill` de
recharts) no resuelven `var()` de forma confiable: SVG2 todavía los define como gramática de atributo y no como
declaraciones CSS, y el issue del W3C sigue abierto (`svgwg#1031`). El mapa cubre serie, marcador, grilla, ejes,
línea de referencia y superficie de tooltip para los dos modos.

---

## 6. Español y accesibilidad

### antd con `es_ES` + `dayjs` en español

- `ConfigProvider locale={esES}` (`antd/locale/es_ES`) traduce **las cadenas propias de antd** — el paginador, el
  panel del `DatePicker`, el `No data` de las tablas — que **no existen en este repositorio** y por eso ningún grep
  de nuestro código las encuentra.
- `dayjs.locale("es")` se ejecuta a **scope de módulo** en `src/app/providers.tsx`, no en un efecto. Razones
  verificables en ese archivo: el módulo se importa estáticamente desde el layout raíz y se evalúa en los dos
  grafos (servidor y navegador) antes de renderizar; un efecto renderizaría una vez con el default `en` y mutaría
  después. Además, ningún componente renderiza una fecha formateada por dayjs en SSR (todas pasan por
  `formatDateTime`, que usa `Intl`), así que no hay salida dependiente del locale en el servidor con la que la
  hidratación pueda discrepar.

### Mapas de labels

- **Tipo, severidad y estado de anomalía:** `src/components/anomalies/anomalyLabels.ts`.
- **Estado del medidor:** `src/components/formatters.ts` (`meterStatusLabels` = `OK` → `Operativo`,
  `DEGRADED` → `Degradado`; `meterStatusLabel` tolera la variante en minúscula `ok` que emite el summary y
  devuelve un valor desconocido sin cambiarlo).

### Qué valor crudo se queda a la vista (y la asimetría)

El valor de cable (`HIGH`, `REAL_ANOMALY`, `explained`…) **no se reescribe**: se etiqueta. Dónde queda la mitad
cruda, medido en navegador real y anotado en el encabezado de `anomalyLabels.ts`:

| Campo | Dónde | Qué se ve |
| --- | --- | --- |
| `type` | `AnomalyTypeTag` (tabla y detalle) | valor crudo **y** label, p. ej. `REAL_ANOMALY` + `Anomalía real` |
| `severity` | columna **Severidad** de la tabla | valor crudo **y** label, p. ej. `HIGH` + `Alta` |
| `severity` | detalle de anomalía | `Tag` con `HIGH` + `Text` `Alta` |
| `status` | columna **Estado** de la tabla | **solo el label** (`Explicada` / `Sin explicación`) |
| `status` | detalle de anomalía | `Sin explicación (unexplained)` |

**La asimetría es la de `status`:** la columna Estado muestra solo el label, mientras Tipo y Severidad muestran el
valor crudo al lado. Es comportamiento **preexistente** (la fase 6 solo cambió el `title` de la columna) y queda
como advisory abierto (`status-column-raw-value`). El estado del medidor en cambio se muestra como
`OK · Operativo` (crudo + label).

### Convenciones de nombre accesible

- **El nombre del link de cada medidor es exactamente el id** (`M-101`), no el nombre completo de la card. Es un
  contrato fijado por `accessibility.test.tsx` y la razón por la que ni la card ni el link llevan `aria-label`.
- **Tabla y gráfico tienen nombre propio:** `Lista de anomalías` (tabla de anomalías), `Tabla de lecturas: …` y
  `Gráfico de lecturas: …`.
- **Los dos controles de limpieza de `/anomalies` tienen nombres distintos:** `Limpiar filtros` (barra de filtros)
  y `Quitar filtros` (empty state). Dos controles con el mismo nombre se rompen para lectores de pantalla y para
  `getByRole("button", { name })`.
- El paginador usa nombres en español para las flechas (`Página anterior` / `Página siguiente`) mediante
  `src/components/paginationLabels.tsx`; sin eso, la flecha se anunciaba como `left`/`right` (el `aria-label` del
  ícono), porque un `aria-label` de un hijo gana sobre el `title` traducido del padre.

---

## 7. Las páginas, una por una

Formato: **qué se ve**, **endpoints**, **estados** con su copia exacta, y **comportamiento destacable**.

### `/` — la entrada

- **Qué se ve:** nada. Es un componente de servidor (`src/app/page.tsx`) cuyo único cuerpo es
  `redirect("/dashboard")`. Costo de JavaScript en el cliente: cero.
- **Endpoints:** ninguno.
- **Notable:** el redirect refleja que el flujo del demo pone Dashboard justo después del login.

### `/login` — Iniciar sesión

- **Qué se ve:** una tarjeta centrada con el `h1` **Iniciar sesión**, el aviso **Credenciales de demostración**
  (`jcamilo` / `bia2026`), el formulario de usuario y contraseña, y el botón **Entrar**. Sin barra superior, sin
  navegación y sin breadcrumb.
- **Endpoints:** `POST /api/auth/login`.
- **Estados:**
  - *En vuelo:* el botón queda deshabilitado y con `loading`, y los campos no se pueden editar.
  - *Error:* un `Alert` con el mensaje **del backend** (`usuario o contraseña incorrectos`, `el usuario no está
    autorizado`, `usuario y contraseña son obligatorios`) o el texto genérico
    `No se pudo iniciar sesión. Revisa tu conexión e intenta de nuevo.` para cualquier otra falla.
- **Notable:**
  - El formulario **no** declara reglas `required` en el cliente: el backend dueño del `400` y mostrar su mensaje
    era el punto.
  - Con una sesión válida ya guardada, redirige a `/dashboard` en lugar de mostrar el formulario.

### `/meters` — Medidores

- **Qué se ve:** `h1` **Medidores**; un buscador con label **Buscar medidor** (placeholder
  `Buscar por id de medidor`); dos grupos de controles (**Filtrar por anomalía**: Todos / Normales / Alertas /
  Críticas, y **Ordenar por**: Orden del backend / Consumo / Variación / Severidad); la línea de conteo
  **`Mostrando N de M medidores.`**; y un **grid responsive de cards** cliqueables, una por medidor.
- **Endpoints:** `GET /meters` (objetos: `id`, `consumption`, `status`, `readings_count`,
  `last_reading_at`) y `GET /anomalies` (para unir por `meter_id`). **No hay ningún request por card.**
- **Estados:**
  - *Cargando:* `Skeleton` de 4 filas (sin texto).
  - *Error:* `RequestError` con título **No se pudieron cargar los medidores**, detalle del backend o
    `Revisa tu conexión e intenta de nuevo.`, y botón **Reintentar** (`retrying={isFetching}`).
  - *Vacío del backend:* `No hay medidores para mostrar.` — y **ningún control se muestra** (no tiene sentido
    invitar a buscar, filtrar u ordenar sobre nada).
  - *Vacío por búsqueda:* `Ningún medidor coincide con la búsqueda.` (distinto del anterior).
  - *Vacío por filtro:* `Ningún medidor coincide con los filtros activos.` (distinto de los dos anteriores).
- **Cada card muestra:** el id (único texto del link, único tab stop), el **badge de severidad** de su anomalía
  más urgente (`HIGH · Alta`) o `Sin anomalías`, y las filas **Estado**, **Consumo** (con unidad kWh),
  **Variación** (el `consumption_change_pct` del DTO, con signo; `—` cuando no hay anomalía) y **Última
  lectura**.
- **Notable:**
  - **La unión se hace en el navegador.** `/meters` aporta `status`, `consumption` y `last_reading_at`;
    `/anomalies` aporta la severidad y la variación. La anomalía de una card es **la primera del array de la API
    cuyo `meter_id` coincide** — el array llega ordenado por `priority` ascendente, así que la primera es la más
    urgente. Tomar la última mostraría los números de la anomalía menos urgente bajo el id del medidor.
  - **Los cuatro filtros particionan la lista:** `Normales` = sin anomalía unida, `Alertas` = `MEDIUM` o `LOW`,
    `Críticas` = `HIGH`, `Todos` = todo. `Críticas` es exactamente el conteo que el resto de la app llama
    "requiere atención prioritaria".
  - **Los tres órdenes tienen una sola dirección fija** (triage, no un toggle asc/desc): mayor consumo primero,
    mayor aumento primero, mayor severidad primero. Una card **sin anomalía siempre queda última**, nunca al
    frente por un accidente numérico.
  - **Filtrado en el cliente con debounce** (`useDebouncedValue`, default 250 ms): la búsqueda filtra el array ya
    obtenido y **no dispara requests**. La búsqueda solo mira el `id` del medidor, que es el único texto que la
    card expone y por lo tanto siempre visible donde hubo match.
  - **El N+1 quedó eliminado.** Antes cada card renderizada hacía su propio `GET /meters/{id}` porque el endpoint
    de lista solo devolvía ids; ahora el fetch de detalle **no existe** y filtrar 100 medidores a 2 cuesta los
    mismos dos requests que la vista completa (el advisory `R3-nplus1-load` de `odd/tasks/meters-cards.md` queda
    obsoleto).
  - La card entera es el área de clic mediante el patrón *stretched link*; el link real conserva el id como único
    texto, así que su nombre accesible sigue siendo el id.

### `/meter/[id]` — Detalle de medidor

- **Qué se ve:** `h1` **`Medidor {meterId}`**; una `Card` con `Descriptions` titulada **Detalles del medidor**:
  `ID`, `ID del medidor`, `Estado` (`OK · Operativo`), `Cantidad de lecturas`, `Creado`, `Última lectura`
  (fechas por `formatDateTime`) con los links **Ver lecturas** y **Ver anomalías** (este último a
  `/anomalies?meter_id=…`); y, debajo, el bloque **Análisis con IA** (`AiReanalysis`) del medidor.
- **Endpoints:** `GET /meters/{meterId}`; y bajo demanda `POST /ai/analyze` (body `{"meter_id":"<meterId>"}`)
  más `GET /ai/analysis/{id}`.
- **Estados:**
  - *Cargando:* `Skeleton` de 6 filas.
  - *404:* `Result` con `status="404"`, título **Medidor no encontrado**, subtítulo
    `No existe un medidor con el id "{meterId}".` y link **Volver a medidores**.
  - *Error:* `RequestError` **No se pudo cargar el medidor** + **Reintentar**.
  - *Análisis en curso:* `role="status"` **El análisis sigue en curso (estado: …). Se actualizará automáticamente.**,
    el botón **Correr análisis con IA** deshabilitado, y la consulta al backend repetida cada 3 s mientras el `status`
    sea `queued` o `running`.
  - *Análisis fallido:* `Alert` error **El análisis falló** — con el `error` del run cuando existe, y si no
    **El backend informó que el análisis falló. Vuelve a intentarlo.** Un `400` del POST (medidor desconocido) muestra
    el `error` del body.
  - *Estado no reconocido:* `Alert` warning **Estado del análisis no reconocido**, que no afirma que el análisis
    haya terminado (y que también detiene el polling).
- **Notable:**
  - `name` y `location` **llegan siempre vacíos** y la tabla no los renderiza.
  - **Análisis con IA por medidor.** El botón **Correr análisis con IA** dispara `POST /ai/analyze` con
    `{"meter_id":"<meterId>"}` y, con el `analysisId` devuelto, consulta `GET /ai/analysis/{id}`. El POST responde
    **`202`** (no es sincrónico): arranca o se une a un run para ese medidor; un segundo POST mientras hay un run en
    vuelo devuelve el `analysisId` existente, así que un doble clic no pierde la corrida. El bloque **lee el `status`**:
    repite la consulta cada 3 s (`ANALYSIS_POLL_INTERVAL_MS`) solo mientras sea `queued` o `running`, y con cualquier
    otro valor detiene el polling, para que un estado desconocido no se vuelva un bucle de requests.
  - **Estado del proceso real.** Un `Steps` de antd dibuja las **siete etapas** en orden (`Lecturas`, `Baseline`,
    `Detección`, `Correlación`, `Eventos`, `Explicación con IA`, `Recomendación`) derivadas del `stage` que informa el
    backend — nunca un avance simulado. Antes de arrancar (`queued`) toda la lista queda pendiente, las etapas
    anteriores quedan `finish` y la activa `process` (o `error` si el run falló). Mientras el run está en vuelo, el
    paso activo muestra los segundos transcurridos (`Explicación con IA — 12 s`); una llamada al LLM no expone
    progreso parcial, así que **nunca se dibuja un porcentaje falso**.
  - **Resultado:** al completar muestra la narrativa del medidor (por el `AnomalyNarrative` seguro), su
    `recommended_action`, la línea de cierre de plataforma `N anomalías detectadas · M requieren atención prioritaria`
    tomada de `platform`, y el link a la anomalía del medidor cuando existe. El resultado es **aditivo** (no reemplaza
    ni reordena ninguna lista determinística).
  - Es **la única ruta** que declara `export const dynamic = "force-dynamic"` (verificado por grep; ninguna otra
    página lo declara).
  - **Defecto conocido:** el `h1` muestra el segmento **crudo** de la ruta. `/meter/M%20109%2FA` renderiza
    `Medidor M%20109%2FA` mientras la API reporta `M 109/A`. Es el defecto `meter-detail-h1-encoded` (ver sección
    10).

### `/meter/[id]/readings` — Lecturas

- **Qué se ve:** `h1` **`Lecturas del medidor {meterId}`**; un `RangePicker` (**Rango de fechas de lecturas**);
  el aviso de refresco **`Actualizando…`** cuando corresponde; el **gráfico** de la señal seleccionada y la
  **tabla** de lecturas.
- **Endpoints:** `GET /meters/{meterId}/readings?from&to` (con `from`/`to` RFC3339 opcionales) y `GET /anomalies`
  (para derivar los marcadores del medidor).
- **Estados:**
  - *Cargando (general):* el gráfico muestra `Spin` con **`Cargando gráfico…`** y la tabla un `Skeleton` de 5
    filas.
  - *Sin datos:* el gráfico muestra `No hay lecturas en el rango seleccionado.`; la tabla, al no tener filas,
    muestra el vacío propio de antd (`No hay datos` con `es_ES`).
  - *Refresco:* con datos previos en cache, al cambiar el rango cambia `isFetching` y aparece `Actualizando…`
    (`role="status"`) **sin blanquear** el gráfico ni la tabla (el payload anterior se conserva).
  - *Error:* `RequestError` **No se pudieron cargar las lecturas** + **Reintentar**.
- **Notable:**
  - **Un solo gráfico con selector de señal** (Consumo kWh, Voltaje V, Corriente A, Factor de potencia
    adimensional 0-1), porque una escala compartida mentiría sobre unidades distintas.
  - **Marcadores de anomalías derivados en el cliente:** la página filtra `GET /anomalies` por `meter_id` y pasa
    a cada marcador su `baseline.mean`. Un marcador solo se dibuja si cae dentro de la ventana graficada (se
    "ajusta" a la lectura más cercana); si no, se lista igual pero no se dibuja. La leyenda y el resumen accesible
    lo explican.
  - **La línea de baseline se dibuja solo con la señal Consumo** (`baseline.mean` es media de consumo en kWh); en
    las otras señales hay una nota `role="note"` que lo aclara en vez de graficar un valor de consumo sobre el eje
    de voltaje.

### `/dashboard` — Panel de control

- **Qué se ve:** `h1` **Panel de control**; un párrafo `sr-only` que describe los KPIs; la fila de KPIs **Estado**,
  **Medidores**, **Consumo total** (con unidad kWh), **Anomalías IA**, **Alta prioridad**, **Confianza IA** y
  **Último análisis** (fecha/hora formateada más una etiqueta de estado); la sección de cambios de la anomalía más
  urgente con **píldoras de delta**; el **banner de insight**; y una `Card` **Resumen de anomalías** con conteos
  **Por tipo** y **Por severidad** más una previsualización de la tabla.
- **Endpoints:** `GET /dashboard/summary` y `GET /anomalies`.
- **Estados:**
  - *Cargando:* 11 cards `Skeleton` (`KPI_CARD_COUNT` = los 7 KPIs más las 4 píldoras de la anomalía más urgente).
  - *Error:* `RequestError` **No se pudo cargar el panel** + **Reintentar** (reintenta ambos queries).
  - *Sin anomalías (previsualización):* `No se reportaron anomalías.`
  - *Banner:* `Hay N anomalías en la última ejecución, M de severidad alta.`; sin datos,
    `Todavía no hay datos de anomalías para resumir.`; con total 0,
    `No se detectaron anomalías en la última ejecución.`
- **Notable:**
  - **Los seis KPIs del §5 de la prueba técnica:** `Medidores`, `Consumo total`, `Anomalías IA`, `Alta prioridad`,
    `Confianza IA` y `Último análisis`. `Estado` (la salud del backend) se conserva junto a ellos.
  - `Consumo total` viene del resumen (`total_consumption`, kWh) y se formatea con `formatMetric`, la misma
    convención decimal del resto de la app. **El número va dentro del `value`**, no en el `suffix`: `Statistic`
    reagrupa un valor numérico con sus propios separadores `en-US` (`12,345`), que en español se leen como
    decimales. Si el campo no llega (un backend anterior a esta fase), el KPI muestra `—` en lugar de romper.
  - **`Alta prioridad` y `Confianza IA` se calculan en el navegador** a partir de la lista obtenida: el conteo de
    `severity === "HIGH"` y el promedio de `confidence`. El resumen **no** expone ningún desglose por severidad ni
    una confianza agregada, así que el backend nunca es consultado por ellos. Con la lista vacía, `Confianza IA`
    muestra `—` (un `0%` afirmaría que el modelo puntuó filas que nunca vio) y `Alta prioridad` muestra `0`, que es
    el conteo real de un conjunto vacío.
  - `Último análisis` formatea el `lastRun` RFC3339 con `formatDateTime` (que devuelve el valor sin tocar si no es
    parseable) y añade el estado **Completado** o **Sin datos**. El resumen no trae un campo de estado, así que la
    única afirmación derivable es si una corrida reportó un timestamp; un estado "en curso" requeriría un progreso
    que el endpoint no expone. Un backend que aún responda el literal `"latest"` degrada a `Sin datos`.
  - Los conteos **Por tipo** y **Por severidad** se calculan **en el navegador** a partir de la lista obtenida,
    porque el summary solo informa totales.
  - Las **píldoras de delta** usan los porcentajes con signo que ya trae el DTO de la anomalía más urgente
    (relativos a su propio `baseline`); **no** son una comparación contra un período anterior (la API no expone una
    corrida previa). Un valor faltante o no finito no dibuja píldora.
  - La tabla de la previsualización es la misma `AnomalyTable` pero **sin ordenamiento y sin paginador** (el
    dashboard no tiene estado donde guardar la página ni el orden). Sí incluye la columna **Acción**.
  - La página está cubierta por la guardia del shell (`PrivateRoute`), no por un envoltorio propio.

### `/anomalies` — Anomalías

- **Qué se ve:** `h1` **Anomalías**; un párrafo `sr-only`; la barra de **filtros** (búsqueda, medidor, tipo,
  severidad, estado, rango de fechas, y **Limpiar filtros**); la línea de conteo **`N de M anomalías coinciden con
  los filtros.`**; y la tabla.
- **Endpoints:** `GET /anomalies`, `GET /meters` (alimenta el filtro por medidor). El análisis con IA **ya no se
  corre acá**: vive en la página de cada medidor.
- **Estados:**
  - *Cargando:* `Skeleton` de 6 filas.
  - *Error de anomalías:* `RequestError` **No se pudieron cargar las anomalías** + **Reintentar**.
  - *Error solo de medidores:* `Alert` warning **Lista de medidores no disponible** con
    `El filtro de medidores no se pudo completar porque la consulta de medidores falló.` (los filtros siguen
    usables).
  - *Vacío del backend:* `El backend no reportó anomalías.`
  - *Vacío por filtros:* `Ninguna anomalía coincide con los filtros actuales.` + botón **Quitar filtros**
    (distinto del **Limpiar filtros** de la barra).
- **Notable:**
  - **Filtrado y ordenamiento en el navegador.** El endpoint devuelve la lista completa y **no acepta parámetros
    de consulta**; ningún control dispara un request.
  - **Filtros y orden respaldados por la URL** (`?q=`, `?meter_id=`, `?type=`, `?severity=`, `?status=`,
    `?detected_from=`, `?detected_to=`, `?sort=`) mediante `useUrlState`. El ordenamiento es por los headers de la
    tabla; `sort=backend` (el default) significa "sin orden propio" y no se escribe en la URL.
  - **La paginación NO está en la URL.** Es estado interno de la tabla (10 filas por página) y se resetea a la
    página 1 cuando cambia el conjunto filtrado.

### `/anomalies/[id]` — Investigación de la anomalía

- **Qué se ve:** `h1` **Investigación de la anomalía** (texto fijo, no el id); y una serie de cards: **Registro de
  la anomalía** (`Descriptions`), **Motivo**, **Acción / conclusión**, **Línea base**, **Cambio vs. la línea base**,
  **Eventos correlacionados**, **Calidad de datos**, **Lectura causal** y **Narrativa del LLM**. Los registros
  `DATA_QUALITY` suman un `Alert` **Problema de calidad de datos**.
- **Endpoints:** `GET /anomalies/{id}`.
- **Estados:**
  - *Sin id:* `Result` 404 **Anomalía no encontrada** con
    `No se proporcionó ningún id de anomalía en la ruta.`
  - *Cargando:* `Skeleton` de 8 filas.
  - *404:* `Result` 404 **Anomalía no encontrada** con `Ninguna anomalía coincide con el id "{id}".` — la página
    es un componente de cliente, así que **no responde el código HTTP**.
  - *Error:* `RequestError` **No se pudo cargar la anomalía** + **Reintentar** + link **Volver a las anomalías**.
  - *Sin eventos correlacionados:* `Ningún evento correlacionado explica esta desviación.`
  - *Sin narrativa LLM:* `La narrativa se genera bajo demanda: corré el análisis con IA desde la página del
    medidor para producirla.`
- **Notable:** el `h1` acá es **estático** ("Investigación de la anomalía"), a diferencia del detalle de medidor:
  no muestra el segmento de ruta. El `meter_id` sí es un link, con el id como texto y el href encodado.

---

## 8. Pruebas y CI

**Runner:** Jest + React Testing Library. Configuración en `jest.config.js`:

- **Alias `@/`**: `"^@/(.*)$": "<rootDir>/src/$1"`, el mismo alias de `tsconfig.json`.
- **CSS modules** mapeados por `identity-obj-proxy` (`"\\.(scss|sass|css)$": "identity-obj-proxy"`), así un import
  de estilos no rompe el test.
- **Entorno `jsdom`** (`testEnvironment: 'jsdom'`).
- **Transform** con `ts-jest`, con `transformIgnorePatterns` que permite una lista explícita de paquetes ESM
  (`react-markdown`/`remark-gfm` y sus dependencias, más los paquetes de color de antd), porque `require()` no los
  puede cargar como CommonJS.
- **`roots: ['<rootDir>/src']`** y `testMatch: ['**/__tests__/**/*.ts?(x)']`.
- **`jest.setup.ts`** (`setupFilesAfterEnv`) hace tres cosas:
  1. carga `@testing-library/jest-dom`;
  2. reemplaza `next/link` por un `<a>` plano, porque `Link` necesita el contexto del App Router que no existe en
     jsdom;
  3. stubea `matchMedia` y `ResizeObserver`, que antd y recharts consultan durante el render y que jsdom no
     implementa.

**`src/test-support/rechartsMock.ts`:** expone `createRechartsMock()`, dobles determinísticos de los componentes de
recharts usados por el gráfico. Existe porque `ResponsiveContainer` mide 0 en jsdom, así que **cada** suite que
renderiza el gráfico debe reemplazar recharts. Antes eran tres `jest.mock("recharts", …)` inline, cada uno con su
propio subconjunto: cuando el gráfico sumó `CartesianGrid` y `ReferenceLine`, uno quedó incompleto y cuatro tests
fallaron. Un único factory evita que una suite mockee menos de lo que el componente renderiza. Los dobles
renderizan nodos DOM reales que exponen las props bajo test.

**CI (`.github/workflows/ci.yml`).** Un solo job, `build`, en `ubuntu-latest`, disparado por push y pull request a
`main`/`master`. Pasos: `npm ci` → `npm run lint` → `npm test` → `npm run build`. Node 20 con cache de npm.

> **Los tests NO se ejecutaron al escribir esta guía.** No se afirma ningún resultado de corrida. (La corrida
> medida que se registra más abajo es posterior a esta sección base.)

- **Conteo que se puede verificar en el árbol (estático, no ejecutado):** 35 archivos de test contados con `find`
  bajo `src/**/__tests__`. Esto cuenta archivos, no tests.
- **Cifra medida (no estimada) en la rama `feat/demo-polish`:** **35 suites / 317 tests** verdes con
  `npx jest --ci`, y `npx tsc --noEmit` y `npx eslint .` sin salida. Es la primera cifra de esta sección que
  proviene de una corrida y no de un conteo estático, y por lo tanto la única que se puede citar como resultado.
- **Cifra registrada en la historia del proyecto:** **32 suites / 279 tests** en el commit `5539905` (fases 0+1 a 6,
  medido entonces). Después, `meters-cards` agregó la suite `MeterCard`, así que el árbol de hoy tiene al menos un
  archivo más.
- **Un conteo estático de declaraciones NO reconcilia** con esa cifra: un grep de líneas `it(`/`test(` da 294, que
  es un artefacto del conteo estático (casos parametrizados, patrones multilínea) y **no** una medición. No se
  imprime como si fuera el número de tests.

---

## 9. Convenciones para contribuir

Citadas de donde están escritas, no inventadas. Las cinco primeras viven en
[`docs/ui-refactor-plan.md`](ui-refactor-plan.md) §"Reglas que dejan las fases anteriores" y en los ODD de cada
cambio.

1. **Español incremental.** De la fase 3 en adelante, **todo componente que se toca nace en español**; la fase 6
   barrió lo que quedaba. Así se evita traducir dos veces lo que una fase posterior reescriba.
2. **StrictMode.** Todo componente con efectos necesita su test renderizado **dentro de `<StrictMode>`**, y todo
   efecto nuevo tiene que ser StrictMode-safe. Next lo activa en dev, y dev es donde se evalúa. (El guard del toast
   de health usa un `useRef`, que sobrevive el remount simulado; un flag de estado leído en el mismo efecto, no.)
3. **Verificar el efecto, no la intención.** Cuando un guard o un cambio importa, se pide un **experimento de
   mutación**: sacar la protección, mostrar que el test **falla**, y **restaurar byte a byte** con hash. Un test que
   no puede fallar por el bug que nombra es falsa confianza.
4. **Un solo origen de color.** **Ningún literal hexágono fuera de `src/theme/tokens.ts`** (verificado: la única
   aparición en `src/` fuera de ese módulo es un comentario). Los colores resuelven por las variables `--bia-*`.
5. **Los nombres accesibles son parte del contrato.** Traducir un nombre rompe silenciosamente un test **o** la
   experiencia de un lector de pantalla. El texto `sr-only` y los `aria-label` se mantienen **en paso con la copia
   visible**.
6. **Conventional Commits, sin Prettier.** Está en [`CONTRIBUTING.md`](../CONTRIBUTING.md): los mensajes siguen el
   formato `<type>(<scope>): <subject>`; **no hay Prettier** declarado en el repositorio ni configuración de
   formato. El único job de CI es `build`.

---

## 10. Problemas conocidos

### Defectos documentados

| ID | Gravedad | Dónde | Qué |
| --- | --- | --- | --- |
| `apiBaseUrl-never-inlined` | WARNING | `src/utils/apiBaseUrl.ts` | `NEXT_PUBLIC_API_URL` nunca llega al navegador; gana siempre el fallback `http://localhost:3001/api` (sección 4) |
| `meter-detail-h1-encoded` | SUGGESTION | `src/app/meter/[id]/page.tsx` | El `h1` del detalle de medidor muestra el segmento crudo de la ruta (`Medidor M%20109%2FA` en vez de `M 109/A`) |

### La trampa del entorno

`dev-127-does-not-hydrate` (WARNING, *environment, not the app*): la app solo hidrata en `http://localhost:3000`
(sección 2). Registrado en `odd/tasks/breadcrumb-gutter.md`. El mecanismo exacto de Next no está probado.

### Advisories abiertos

Los advisories del refactor están consolidados en la tabla de [`docs/ui-refactor-plan.md`](ui-refactor-plan.md)
(sección *Advisories*) y en los ODD de cada fase; los más recientes, en
`odd/tasks/refactor-improve-ui-phase-6.md`, `odd/tasks/meters-cards.md` y `odd/tasks/breadcrumb-gutter.md`.

- **Fase 3 (abiertos):** `R3-2` (composición del shell), `R3-3` / `R3-badge-guard` (gating del badge),
  `R3-shell-fetch-every-mount` (el query del summary en el shell), `R3-theme-persist-effect`,
  `R3-chart-empty-coverage`, `R3-backend-status-unmount-safety`, `R3-request-error-shared-id`,
  `R3-theme-toggle-stale-closure` (el `toggle` lee `mode` del closure y no usa updater funcional).
  *(Resueltos: `R3-1`, `R3-retry-loading-flag`, `R3-breadcrumb-encoding`.)*
- **Fase 6:** `status-column-raw-value` (la asimetría de la columna Estado), `pagination-nesting-spy-order`,
  `pagination-two-tooltips`, `R3-dashboard-health-raw-value`, `R3-detail-severity-label`, `R3-pagination-wiring`.
- **`meters-cards`:** `meters-hit-area-jsdom` (el área de clic y el anillo de foco son propiedades solo de
  navegador), `meters-visible-set-negative`, `no-red-first-evidence`.
  *(Resuelto: `R3-nplus1-load` (WARNING) — un `GET /api/meters/{id}` por card renderizada, costo aceptado
  explícitamente por el dueño antes de empezar — quedó cerrado en `demo-polish`: el endpoint de lista ahora
  devuelve objetos y `MeterCard` no hace ningún request. Se conserva acá como registro de lo que se aceptó en su
  momento, no como advisory abierto.)*
- **`breadcrumb-gutter`:** `breadcrumb-margin-jsdom-invisible`, `page-padding-shape-proxies`,
  `breadcrumb-item-4px-overhang`, `production-cascade-unverified`.

**Hallazgo del verificador sin advisory:** el skeleton de `ReadingsTable` es de **párrafo** para una tabla de seis
columnas (se contradice con su propio comentario); sigue abierto.

### Deuda

`T-SUITE`: ~2.3 s/test contra el default de 5 s de Jest. **Ni confirmada ni refutada** (una corrida limpia no la
refutó; se observó un timeout flaky una vez). No está resuelta.

### Rarezas que vale flaggear

- **`jest` está declarado en `dependencies`**, no en `devDependencies` (verificado en `package.json`). Un test
  runner no es una dependencia de runtime.
- **La guardia de autenticación no es una frontera de seguridad** (sección 3): el backend no valida el token, así
  que quien conozca la URL entra a las pantallas; la guardia solo ordena el flujo del demo.
- **Solo `/meter/[id]` declara `force-dynamic`**; ninguna otra ruta lo hace (verificado por grep).
- **El skeleton de `ReadingsTable`** es de párrafo para una tabla de seis columnas (ver arriba).
- **El `h1` del detalle de medidor** muestra el segmento crudo de la ruta (`meter-detail-h1-encoded`).

### Decisión abierta

El **merge a `main`** es del dueño, no del flujo de trabajo. La rama no se puede revisar como un solo candidato
(el primer `START` falló con `lens_context_budget_exceeded` sobre la rama acumulada), así que cada cambio nuevo
necesita su propia rebanada de review.

---

## 11. Mapa de la documentación

| Documento | Qué cubre | Rol |
| --- | --- | --- |
| [`docs/backend-requirements.md`](backend-requirements.md) | El contrato HTTP confirmado contra el backend: rutas, formas de respuesta, enums y notas operativas | **Contrato (autoritativo)** |
| [`docs/endpoints.md`](endpoints.md) | Puntero corto al contrato; no lo reproduce a propósito | Contrato (índice) |
| [`docs/routes.md`](routes.md) | Cada ruta y los endpoints que consume, más la capa de API | Mapa mecánico |
| [`docs/project-structure.md`](project-structure.md) | Carpetas y su responsabilidad | Mapa de estructura |
| [`docs/frontend-guide.md`](frontend-guide.md) | **Esta guía**: arquitectura, flujo de datos, páginas, estados, convenciones, tests/CI y problemas conocidos | **Guía** |
| [`docs/ui-refactor-plan.md`](ui-refactor-plan.md) | Estado, fases hechas, cambios posteriores, advisories, y cómo retomar | **Proceso / estado / historia** |
| [`odd/tasks/*.md`](../odd/tasks) | El registro ODD por feature (plan, tareas, evidencia, recibos) | Proceso / historia |
| [`README.md`](../README.md) | Punto de entrada: stack, scripts, rutas y capa de API | Entrada |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Flujo de contribución: branches, commits, CI, sin Prettier | Proceso |
| [`docs/requisitos/Requerimientos.md`](requisitos/Requerimientos.md) | Los requisitos originales de la prueba técnica | Historia (input) |
| [`docs/requisitos/Frontend_implementation_plan.md`](requisitos/Frontend_implementation_plan.md) | El plan de implementación original (el bundler `vite` que listaba nunca se adoptó) | Historia (input) |
| [`docs/decisions/vite-decision.md`](decisions/vite-decision.md) | La decisión de bundler, **superada** | Historia (ADR) |
| [`AGENTS.md`](../AGENTS.md) | Notas de agente de Next.js, regeneradas por `next dev` | Referencia |

**Empezá por:** esta guía (cómo funciona) → `docs/routes.md` (qué pega a qué) → `docs/backend-requirements.md`
(el contrato) → `docs/ui-refactor-plan.md` (dónde está parado el trabajo).

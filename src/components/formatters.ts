/**
 * Formatting helpers for values the UI renders.
 *
 * These live outside `anomalies/` on purpose. They were in `anomalyLabels.ts`,
 * which is about anomaly metadata (types, severities, their labels and colors),
 * and that made three unrelated modules — `MeterDetail`, `ReadingsTable` and
 * `ReadingsChart` — import a file named after a feature they have nothing to do
 * with. A date formatter is not an anomaly label. Keeping one obvious home for
 * presentational formatting is also what stops a second date formatter from
 * appearing the next time a chart needs one.
 *
 * Everything here is presentation only. The wire values stay raw in the DTO and
 * in every comparator, so sorting and filtering keep operating on the original
 * RFC3339 strings and numbers.
 */

/** Renders the `0..1` confidence as a whole-number percentage. */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Renders a signed percentage with one decimal and a trailing `%`, so a
 * negative deviation keeps its minus sign and a positive one is marked with
 * `+`. The value is the API-provided number, never re-derived in the UI.
 */
export function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/** Renders a number with a fixed number of decimals for evidence display. */
export function formatMetric(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits);
}

/**
 * Renders an RFC3339 timestamp as a readable date and time.
 *
 * Timestamp decision: **local time**, not UTC. Every timestamp in the DTO is
 * RFC3339 with an explicit `Z`, but the people reading this UI are operators
 * comparing a reading against their own clock, and the date filters this app
 * already ships build their boundaries from the viewer's LOCAL day
 * (`dayjs(...).startOf("day")` in `AnomalyFilters` and the `RangePicker` on the
 * readings page). Rendering UTC here would make the filtered window and the
 * displayed hours disagree for every viewer outside UTC. The raw value stays in
 * the DTO, so anyone comparing against the API or a log still has it.
 *
 * This is the single date formatter in the app: every render site calls it
 * instead of interpolating the wire string, so the choice above is applied
 * everywhere at once.
 *
 * Failure policy: a malformed or empty timestamp never becomes `Invalid Date`
 * and never throws. It is returned unchanged, because the original string is
 * the only truthful thing left to show and a parse failure must not blank a
 * cell or break a render.
 *
 * `timeZone` lets a caller pin an explicit zone (an IANA name such as
 * `"UTC"`) instead of the viewer's; omitted, the viewer's local zone is used.
 *
 * Call sites must WRAP this function rather than pass it directly to a library
 * callback that forwards extra arguments — recharts hands a tick index as the
 * second parameter, which would arrive here as `timeZone` and throw.
 */
export function formatDateTime(value: string, timeZone?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    // `h23` keeps midnight as `00:00` instead of the `24:00` some locales emit.
    hourCycle: "h23",
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date);
  const segment = (type: string): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${segment("day")}/${segment("month")}/${segment("year")} ${segment("hour")}:${segment("minute")}`;
}

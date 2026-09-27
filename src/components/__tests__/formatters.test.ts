import { formatDateTime } from "../formatters";

/**
 * The expected LOCAL rendering, built from the native `Date` getters instead of
 * from `formatDateTime` itself, so the test is not just re-running the code it
 * checks and it stays honest across runner timezones.
 */
function localExpected(value: string): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

describe("formatDateTime", () => {
  it("renders an RFC3339 timestamp with the viewer's local wall clock", () => {
    // The instant is the same everywhere; the visible hour follows the runner's
    // zone, which is exactly the local-time decision this helper makes.
    expect(formatDateTime("2026-09-12T14:00:00Z")).toBe(
      localExpected("2026-09-12T14:00:00Z"),
    );
  });

  it("formats an explicitly pinned zone deterministically", () => {
    // The optional zone is what makes the output testable without mutating the
    // process TZ: the same instant always reads `14:00` in UTC.
    expect(formatDateTime("2026-09-12T14:00:00Z", "UTC")).toBe(
      "12/09/2026 14:00",
    );
    expect(formatDateTime("2024-01-01T00:00:00Z", "UTC")).toBe(
      "01/01/2024 00:00",
    );
  });

  it("uses the local zone rather than UTC when the viewer is offset from UTC", () => {
    const value = "2026-09-12T14:00:00Z";
    const utc = formatDateTime(value, "UTC");
    if (new Date(value).getTimezoneOffset() === 0) {
      // A UTC runner cannot distinguish the two by value; pin the shared result.
      expect(formatDateTime(value)).toBe(utc);
    } else {
      expect(formatDateTime(value)).not.toBe(utc);
      expect(formatDateTime(value)).toBe(localExpected(value));
    }
  });

  it("returns a malformed timestamp unchanged instead of `Invalid Date`", () => {
    expect(formatDateTime("not-a-timestamp")).toBe("not-a-timestamp");
    expect(formatDateTime("not-a-timestamp")).not.toMatch(/Invalid/);
  });

  it("returns an empty timestamp unchanged", () => {
    expect(formatDateTime("")).toBe("");
    expect(formatDateTime("")).not.toMatch(/Invalid/);
  });
});

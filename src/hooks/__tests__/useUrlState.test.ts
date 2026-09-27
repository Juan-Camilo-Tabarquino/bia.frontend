import { act, renderHook } from "@testing-library/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  parseUrlState,
  serializeUrlState,
  useUrlState,
  type UrlStateSchema,
} from "../useUrlState";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

/**
 * A deliberately non-anomaly state object: the hook is a reusable serialization
 * layer and must never know the field names of the page that consumes it.
 */
interface DemoState {
  name: string | null;
  level: "low" | "high";
}

const demoSchema: UrlStateSchema<DemoState> = {
  name: {
    param: "name",
    defaultValue: null,
    parse: (raw) => (raw.trim().length > 0 ? raw : undefined),
    // A cleared value returns `null`, which removes the parameter entirely.
    serialize: (value) => value,
  },
  level: {
    param: "level",
    defaultValue: "low",
    parse: (raw) => (raw === "low" || raw === "high" ? raw : undefined),
    // "low" is the declared default, so it must stay out of the URL.
    serialize: (value) => (value === "low" ? null : value),
  },
};

const mockedUseSearchParams = useSearchParams as jest.Mock;
const mockedUsePathname = usePathname as jest.Mock;
const mockedUseRouter = useRouter as jest.Mock;

const replace = jest.fn();
const push = jest.fn();

describe("parseUrlState", () => {
  it("reads every declared parameter back into the typed state", () => {
    expect(
      parseUrlState(demoSchema, new URLSearchParams("name=alpha&level=high")),
    ).toEqual({ name: "alpha", level: "high" });
  });

  it("falls back to the declared default for an absent parameter", () => {
    expect(parseUrlState(demoSchema, new URLSearchParams())).toEqual({
      name: null,
      level: "low",
    });
    expect(parseUrlState(demoSchema, undefined)).toEqual({
      name: null,
      level: "low",
    });
  });

  it("falls back to the declared default when the value is invalid", () => {
    expect(
      parseUrlState(demoSchema, new URLSearchParams("name=&level=sideways")),
    ).toEqual({ name: null, level: "low" });
  });
});

describe("serializeUrlState", () => {
  it("round-trips a state object through the query string", () => {
    const state: DemoState = { name: "alpha", level: "high" };
    const params = serializeUrlState(demoSchema, state);

    expect(params.toString()).toBe("name=alpha&level=high");
    expect(parseUrlState(demoSchema, params)).toEqual(state);
  });

  it("omits default values so the query string stays empty", () => {
    const params = serializeUrlState(demoSchema, { name: null, level: "low" });

    expect(params.toString()).toBe("");
  });

  it("removes the parameter of a cleared value and keeps the rest", () => {
    const params = serializeUrlState(demoSchema, { name: null, level: "high" });

    expect(params.has("name")).toBe(false);
    expect(params.toString()).toBe("level=high");
  });
});

describe("useUrlState", () => {
  beforeEach(() => {
    replace.mockReset();
    push.mockReset();
    mockedUseSearchParams.mockReset();
    mockedUseSearchParams.mockReturnValue(new URLSearchParams());
    mockedUsePathname.mockReset();
    mockedUsePathname.mockReturnValue("/demo");
    mockedUseRouter.mockReset();
    mockedUseRouter.mockReturnValue({ replace, push });
  });

  it("seeds the state from the query string on mount", () => {
    mockedUseSearchParams.mockReturnValue(
      new URLSearchParams("name=alpha&level=high"),
    );

    const { result } = renderHook(() => useUrlState(demoSchema));

    expect(result.current[0]).toEqual({ name: "alpha", level: "high" });
    expect(replace).not.toHaveBeenCalled();
  });

  it("replaces the URL, without pushing history, when the state changes", () => {
    const { result } = renderHook(() => useUrlState(demoSchema));

    act(() => {
      result.current[1]({ name: "alpha", level: "low" });
    });

    expect(result.current[0]).toEqual({ name: "alpha", level: "low" });
    expect(replace).toHaveBeenCalledWith("/demo?name=alpha", { scroll: false });
    // Replacing keeps one history entry; pushing per change would not.
    expect(push).not.toHaveBeenCalled();
  });

  it("drops the query string entirely when every value is the default", () => {
    const { result } = renderHook(() => useUrlState(demoSchema));

    act(() => {
      result.current[1]({ name: null, level: "low" });
    });

    expect(replace).toHaveBeenCalledWith("/demo", { scroll: false });
  });

  it("still updates the local state when no router is available", () => {
    // Mirrors a host that mounts the hook without the App Router context (or a
    // test double that only stubs `useSearchParams`): rendering must not crash.
    mockedUseRouter.mockReturnValue(undefined);

    const { result } = renderHook(() => useUrlState(demoSchema));

    act(() => {
      result.current[1]({ name: "alpha", level: "high" });
    });

    expect(result.current[0]).toEqual({ name: "alpha", level: "high" });
    expect(replace).not.toHaveBeenCalled();
  });

  // Regression guard for the silent-data-loss bug this hook was fixed to
  // prevent. The page merges filter patches with `setUrlState((previous) =>
  // ({ ...previous, ...patch }))`; before the updater form existed it spread a
  // value captured at render time, so TWO updates landing before a re-render
  // dropped one of them.
  //
  // The assertion that actually catches a regression is the URL one below, not
  // the state one: `stateRef` would carry the merged object even if the updater
  // form were removed, so only the serialized write distinguishes the two
  // implementations. Both are kept because they fail for different reasons.
  it("keeps both updates when two land before a re-render", () => {
    const { result } = renderHook(() => useUrlState(demoSchema));

    act(() => {
      result.current[1]((previous) => ({ ...previous, name: "alpha" }));
      result.current[1]((previous) => ({ ...previous, level: "low" }));
    });

    expect(result.current[0]).toEqual({ name: "alpha", level: "low" });
  });

  it("derives each URL write from the updater's own result, not the stale value", () => {
    const { result } = renderHook(() => useUrlState(demoSchema));

    act(() => {
      result.current[1]((previous) => ({ ...previous, name: "alpha" }));
      result.current[1]((previous) => ({ ...previous, level: "low" }));
    });

    // Each updater writes the URL for the state IT produced. With the updater
    // form removed, the write is built from a value captured at render time and
    // this drops one of the two keys.
    expect(replace).toHaveBeenLastCalledWith("/demo?name=alpha", {
      scroll: false,
    });
    expect(result.current[0]).toEqual({ name: "alpha", level: "low" });
  });
});

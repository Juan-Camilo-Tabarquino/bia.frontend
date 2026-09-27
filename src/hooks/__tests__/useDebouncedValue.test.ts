import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "../useDebouncedValue";

/**
 * `useDebouncedValue` schedules a `setTimeout` in an effect, so every test
 * drives it with fake timers (the delay is injectable precisely for that) and
 * the StrictMode case renders inside `<StrictMode>` like the app does in dev.
 */
describe("useDebouncedValue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the initial value without waiting", () => {
    const { result } = renderHook(() => useDebouncedValue("initial", 100));

    expect(result.current).toBe("initial");
  });

  it("withholds a new value until the injected delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 100),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(99);
    });
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
  });

  it("restarts its timer so only the last value in a burst is emitted", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 100),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    act(() => {
      jest.advanceTimersByTime(90);
    });
    rerender({ value: "c" });
    act(() => {
      // The window restarted: 99ms after "c" must still show the old value.
      jest.advanceTimersByTime(99);
    });
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("c");
  });

  it("honours the injected delay instead of a hardcoded one", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) =>
        useDebouncedValue(value, delay),
      { initialProps: { value: "a", delay: 5 } },
    );

    rerender({ value: "b", delay: 5 });
    act(() => {
      jest.advanceTimersByTime(5);
    });

    expect(result.current).toBe("b");
  });

  it("emits the settled value once under StrictMode's double-invoked effects", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 100),
      { initialProps: { value: "a" }, wrapper: StrictMode },
    );

    rerender({ value: "b" });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe("b");
  });
});

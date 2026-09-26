import '@testing-library/jest-dom';

// Next.js `Link` relies on the App Router context, which is absent in jsdom.
// Render a plain anchor so navigation targets stay assertable.
jest.mock('next/link', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: ({
      href,
      children,
      ...rest
    }: { href: string; children?: React.ReactNode } & Record<string, unknown>) =>
      ReactModule.createElement('a', { href, ...rest }, children),
  };
});

// antd components query matchMedia during render; jsdom does not implement it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// recharts' ResponsiveContainer (and some antd internals) expect ResizeObserver.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

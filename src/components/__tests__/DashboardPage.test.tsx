import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import DashboardPage from '../../app/dashboard/page';
import { formatDateTime } from '../../components/formatters';

jest.mock('../../features/api/apiSlice', () => ({
  useGetDashboardSummaryQuery: jest.fn(),
  useGetAnomaliesQuery: jest.fn(),
}));

import {
  useGetAnomaliesQuery,
  useGetDashboardSummaryQuery,
} from '../../features/api/apiSlice';
import type { Anomaly } from '../../types/backend';

const mockedUseGetDashboardSummaryQuery =
  useGetDashboardSummaryQuery as jest.Mock;
const mockedUseGetAnomaliesQuery = useGetAnomaliesQuery as jest.Mock;

const refetchSummary = jest.fn();
const refetchAnomalies = jest.fn();

// The §5 example values: 12 meters, 4 anomalies, 2 of them HIGH, and a real
// RFC3339 timestamp where the endpoint used to answer the literal "latest".
const summary = {
  health: 'ok',
  meters: 12,
  anomalies: 4,
  total_consumption: 12345.6,
  lastRun: '2026-09-28T00:16:17Z',
};

const anomalies: Anomaly[] = [
  {
    id: 'a1',
    meter_id: 'M-101',
    detected_at: '2026-09-10T09:00:00Z',
    type: 'REAL_ANOMALY',
    severity: 'HIGH',
    confidence: 0.9,
    reason: 'Sudden consumption spike',
    recommended_action: 'Inspect meter',
    status: 'unexplained',
    priority: 1,
    baseline: {
      mean: 52.16,
      stddev: 20.84,
      count: 336,
      voltage_mean: 219.38,
      current_mean: 238.82,
      power_factor_mean: 0.905,
    },
    consumption_change_pct: 125.28,
    voltage_change_pct: -2.71,
    current_change_pct: 111.16,
    power_factor_change_pct: -18.16,
    correlated_events: [],
    data_quality: { flagged: false, reason: '' },
  },
  {
    id: 'a2',
    meter_id: 'M-102',
    detected_at: '2026-09-11T09:00:00Z',
    type: 'DATA_QUALITY',
    severity: 'LOW',
    confidence: 0.5,
    reason: 'Missing readings',
    recommended_action: 'Check wiring',
    status: 'explained',
    priority: 4,
    baseline: {
      mean: 27.55,
      stddev: 4.77,
      count: 336,
      voltage_mean: 221.1,
      current_mean: 125.54,
      power_factor_mean: 0.94,
    },
    consumption_change_pct: -26.42,
    voltage_change_pct: 8.43,
    current_change_pct: 28.78,
    power_factor_change_pct: -23.38,
    correlated_events: [],
    data_quality: { flagged: true, reason: 'power factor 0.720 below 0.85' },
  },
];

/**
 * The §5 shape: four anomalies of which **M-109 and M-112 are the two HIGH ones**,
 * so the browser-derived `Alta prioridad` KPI has to read 2 while the summary
 * only supplies the total.
 */
const fourAnomalies: Anomaly[] = [
  { ...anomalies[0], id: 'f1', meter_id: 'M-109', severity: 'HIGH', priority: 1, confidence: 0.97 },
  {
    ...anomalies[1],
    id: 'f2',
    meter_id: 'M-112',
    type: 'DATA_QUALITY',
    severity: 'HIGH',
    priority: 2,
    confidence: 0.9,
  },
  { ...anomalies[0], id: 'f3', meter_id: 'M-101', severity: 'MEDIUM', priority: 3, confidence: 0.8 },
  {
    ...anomalies[1],
    id: 'f4',
    meter_id: 'M-102',
    type: 'REAL_ANOMALY',
    severity: 'LOW',
    priority: 4,
    confidence: 0.5,
  },
];

function mockLoaded(
  summaryValue = summary,
  anomalyList: Anomaly[] = anomalies,
): void {
  mockedUseGetDashboardSummaryQuery.mockReturnValue({
    data: summaryValue,
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: refetchSummary,
  });
  mockedUseGetAnomaliesQuery.mockReturnValue({
    data: anomalyList,
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: refetchAnomalies,
  });
}

/**
 * One KPI card, addressed by its title within the KPI region.
 *
 * Scoping the value assertion to the card is what keeps it from matching the
 * insight banner's highlighted number, which renders as its own element in the
 * same region (`Alta prioridad` is 2, and so is the banner's HIGH count).
 */
function kpiCard(title: string): HTMLElement {
  const region = within(
    screen.getByRole('region', { name: 'Indicadores clave' }),
  );
  const card = region.getByText(title).closest('.ant-card');
  if (!card) {
    throw new Error(`no KPI card titled ${title}`);
  }
  return card as HTMLElement;
}

/** The pill that renders `value`, so a direction can be asserted per field. */
function pillFor(container: HTMLElement, value: string): HTMLElement {
  const pill = Array.from(
    container.querySelectorAll<HTMLElement>('[data-direction]'),
  ).find((candidate) => candidate.textContent?.includes(value));
  if (!pill) {
    throw new Error(`No delta pill rendering ${value}`);
  }
  return pill;
}

describe('DashboardPage component', () => {
  beforeEach(() => {
    mockedUseGetDashboardSummaryQuery.mockReset();
    mockedUseGetAnomaliesQuery.mockReset();
    refetchSummary.mockReset();
    refetchAnomalies.mockReset();
  });

  it('renders a skeleton while the requests are pending', () => {
    mockedUseGetDashboardSummaryQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: undefined,
      refetch: refetchSummary,
    });
    mockedUseGetAnomaliesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: undefined,
      refetch: refetchAnomalies,
    });

    const { container } = render(<DashboardPage />);

    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
  });

  it('renders the API error message and retries both queries', () => {
    mockedUseGetDashboardSummaryQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { message: 'Oops' },
      refetch: refetchSummary,
    });
    mockedUseGetAnomaliesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: refetchAnomalies,
    });

    render(<DashboardPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Oops');
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetchSummary).toHaveBeenCalledTimes(1);
    expect(refetchAnomalies).toHaveBeenCalledTimes(1);
  });

  it('renders the KPI block from the deterministic summary and the fetched anomalies', () => {
    mockLoaded(summary, fourAnomalies);

    render(<DashboardPage />);

    const kpis = within(
      screen.getByRole('region', { name: 'Indicadores clave' }),
    );
    for (const title of [
      'Estado',
      'Medidores',
      'Consumo total',
      'Anomalías IA',
      'Alta prioridad',
      'Confianza IA',
      'Último análisis',
    ]) {
      expect(kpis.getByText(title)).toBeInTheDocument();
    }

    expect(within(kpiCard('Estado')).getByText('Operativo')).toBeInTheDocument();
    expect(within(kpiCard('Medidores')).getByText('12')).toBeInTheDocument();
    // Consumo total is the one KPI that carries a unit, and the number keeps the
    // shared fixed-decimal format (never antd's own digit grouping).
    expect(
      within(kpiCard('Consumo total')).getByText('12345.6 kWh'),
    ).toBeInTheDocument();
    expect(within(kpiCard('Anomalías IA')).getByText('4')).toBeInTheDocument();
    // M-109 and M-112 are the two HIGH rows, counted in the browser.
    expect(
      within(kpiCard('Alta prioridad')).getByText('2'),
    ).toBeInTheDocument();
    // mean(0.97, 0.90, 0.80, 0.50) = 0.7925 -> 79%.
    expect(within(kpiCard('Confianza IA')).getByText('79%')).toBeInTheDocument();

    // Último análisis formats the RFC3339 timestamp, and the literal `"latest"`
    // placeholder it replaced is nowhere on the page.
    const lastRun = kpiCard('Último análisis');
    expect(
      within(lastRun).getByText(formatDateTime(summary.lastRun)),
    ).toBeInTheDocument();
    expect(within(lastRun).getByText('Completado')).toBeInTheDocument();
    expect(kpis.queryByText('latest')).toBeNull();
  });

  it('reports no data for the last analysis when the summary carries no run', () => {
    // An older backend still answers the literal placeholder. It must not crash,
    // must not echo the placeholder as if it were a date, and must not claim the
    // analysis ran.
    mockLoaded({ ...summary, lastRun: 'latest' }, fourAnomalies);

    render(<DashboardPage />);

    const lastRun = kpiCard('Último análisis');
    expect(within(lastRun).getByText('Sin datos')).toBeInTheDocument();
    expect(within(lastRun).queryByText('Completado')).toBeNull();
  });

  it('shows no confidence when there is nothing to average', () => {
    mockLoaded({ ...summary, anomalies: 0 }, []);

    render(<DashboardPage />);

    // Both browser-derived KPIs degrade to what the data supports: an empty list
    // has no confidence, and `0%` would claim the model scored rows it never
    // saw. The HIGH count is a real zero, because it counts an empty set.
    expect(
      within(kpiCard('Confianza IA')).getByText('—'),
    ).toBeInTheDocument();
    expect(
      within(kpiCard('Alta prioridad')).getByText('0'),
    ).toBeInTheDocument();
  });

  it('renders the anomaly overview with a link to each anomaly detail', () => {
    mockLoaded();

    render(<DashboardPage />);

    expect(screen.getByText('M-101')).toBeInTheDocument();
    expect(screen.getByText('REAL_ANOMALY')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('Sin explicación')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'a1' })).toHaveAttribute(
      'href',
      '/anomalies/a1',
    );
    expect(screen.getByRole('link', { name: 'a2' })).toHaveAttribute(
      'href',
      '/anomalies/a2',
    );
  });

  it('links to the full anomalies list and to the meters page', () => {
    mockLoaded();

    render(<DashboardPage />);

    expect(
      screen.getByRole('link', { name: 'Ver todas las anomalías' }),
    ).toHaveAttribute('href', '/anomalies');
    expect(screen.getByRole('link', { name: 'Ver medidores' })).toHaveAttribute(
      'href',
      '/meters',
    );
  });

  it('derives type and severity counts in the browser from the fetched array', () => {
    mockLoaded();

    render(<DashboardPage />);

    expect(screen.getByText('Anomalía real: 1')).toBeInTheDocument();
    expect(
      screen.getByText('Problema de calidad de datos: 1'),
    ).toBeInTheDocument();
    expect(screen.getByText('Alta: 1')).toBeInTheDocument();
    expect(screen.getByText('Baja: 1')).toBeInTheDocument();
  });

  it('renders an empty overview when the backend reports no anomalies', () => {
    mockLoaded({ ...summary, anomalies: 0 }, []);

    render(<DashboardPage />);

    expect(screen.getByText('No se reportaron anomalías.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('previews at most five anomalies and points to the full list', () => {
    const many: Anomaly[] = [];
    for (let index = 0; index < 7; index += 1) {
      many.push({ ...anomalies[0], id: `a${index}` });
    }
    mockLoaded({ ...summary, anomalies: 7 }, many);

    render(<DashboardPage />);

    expect(
      screen.getByText(/Mostrando las primeras 5 de 7 anomalías/),
    ).toBeInTheDocument();
  });

  it('gives each signed change of the most urgent anomaly its own delta pill', () => {
    mockLoaded();

    const { container } = render(<DashboardPage />);

    // `a1` heads the API-ordered array (priority 1), so these are its four DTO
    // change fields shown verbatim, each rounded by the shared formatter.
    expect(pillFor(container, '+125.3%')).toHaveClass('up');
    expect(pillFor(container, '-2.7%')).toHaveClass('down');
    expect(pillFor(container, '+111.2%')).toHaveClass('up');
    expect(pillFor(container, '-18.2%')).toHaveClass('down');

    // A decrease keeps the DTO's minus sign; it is never flipped to positive.
    expect(screen.queryByText('18.2%')).not.toBeInTheDocument();

    // Exactly four pills, one per DTO change field. The four summary KPIs get
    // none, because the summary carries no prior period to compare against.
    expect(container.querySelectorAll('[data-direction]')).toHaveLength(4);
  });

  it('derives the insight banner only from the summary total and the fetched rows', () => {
    mockLoaded(summary, fourAnomalies);

    render(<DashboardPage />);

    // 4 comes from the SUMMARY (only four rows were fetched, of which two are
    // HIGH), so the total is the DTO value and the high count is the row count.
    const banner = screen.getByText(/Hay 4 anomalías/);
    expect(banner).toHaveTextContent(
      'Hay 4 anomalías en la última ejecución, 2 de severidad alta.',
    );
    expect(within(banner).getByText('2')).toHaveClass('number');
  });

  it('keeps every KPI card and the anomaly table alongside the pills', () => {
    mockLoaded();

    render(<DashboardPage />);

    const kpis = within(
      screen.getByRole('region', { name: 'Indicadores clave' }),
    );
    for (const title of [
      'Estado',
      'Medidores',
      'Consumo total',
      'Anomalías IA',
      'Alta prioridad',
      'Confianza IA',
      'Último análisis',
    ]) {
      expect(kpis.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows no delta pill when there is no anomaly to describe', () => {
    mockLoaded({ ...summary, anomalies: 0 }, []);

    const { container } = render(<DashboardPage />);

    expect(container.querySelectorAll('[data-direction]')).toHaveLength(0);
    expect(
      screen.getByText('No se detectaron anomalías en la última ejecución.'),
    ).toBeInTheDocument();
  });

  // SHAPE PROXY, not an alignment check. jsdom loads no stylesheets, so the real
  // 144 px content edge (E2) is unobservable here; what this pins is the shape
  // the fix introduced: the page wrapper owns the VERTICAL padding only and adds
  // no horizontal padding that would double the shell gutter. Restoring
  // `padding: "1rem"` on the wrapper makes this fail.
  it('leaves the horizontal gutter to the shell and keeps only vertical padding', () => {
    mockLoaded();

    render(<DashboardPage />);

    const wrapper = screen.getByRole('heading', { level: 1 }).parentElement;
    expect(wrapper?.style.paddingBlock).toBe('1rem');
    expect(wrapper?.style.padding).toBe('');
    expect(wrapper?.style.paddingLeft).toBe('');
    expect(wrapper?.style.paddingRight).toBe('');
    expect(wrapper?.style.paddingInline).toBe('');
  });
});

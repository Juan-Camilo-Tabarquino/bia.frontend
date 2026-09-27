import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import DashboardPage from '../../app/dashboard/page';

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

const summary = { health: 'ok', meters: 3, anomalies: 2, lastRun: 'latest' };

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

  it('renders the KPI block from the deterministic summary', () => {
    mockLoaded();

    render(<DashboardPage />);

    const kpis = within(
      screen.getByRole('region', { name: 'Indicadores clave' }),
    );
    expect(kpis.getByText('Estado')).toBeInTheDocument();
    expect(kpis.getByText('Operativo')).toBeInTheDocument();
    expect(kpis.getByText('Medidores')).toBeInTheDocument();
    expect(kpis.getByText('3')).toBeInTheDocument();
    expect(kpis.getByText('Anomalías')).toBeInTheDocument();
    expect(kpis.getByText('2')).toBeInTheDocument();
    expect(kpis.getByText('Última ejecución')).toBeInTheDocument();
    expect(kpis.getByText('latest')).toBeInTheDocument();
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
    mockLoaded();

    render(<DashboardPage />);

    const banner = screen.getByText(/Hay 2 anomalías/);
    expect(banner).toHaveTextContent(
      'Hay 2 anomalías en la última ejecución, 1 de severidad alta.',
    );
    // The single HIGH-severity row is the highlighted number.
    expect(within(banner).getByText('1')).toHaveClass('number');
  });

  it('keeps the four summary KPI cards and the anomaly table alongside the pills', () => {
    mockLoaded();

    render(<DashboardPage />);

    const kpis = within(
      screen.getByRole('region', { name: 'Indicadores clave' }),
    );
    for (const title of ['Estado', 'Medidores', 'Anomalías', 'Última ejecución']) {
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
});

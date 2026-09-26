import React from 'react';
import { render, screen } from '@testing-library/react';
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
    error: undefined,
  });
  mockedUseGetAnomaliesQuery.mockReturnValue({
    data: anomalyList,
    isLoading: false,
    error: undefined,
  });
}

describe('DashboardPage component', () => {
  beforeEach(() => {
    mockedUseGetDashboardSummaryQuery.mockReset();
    mockedUseGetAnomaliesQuery.mockReset();
  });

  it('renders a loading spinner while the requests are pending', () => {
    mockedUseGetDashboardSummaryQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });
    mockedUseGetAnomaliesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    const { container } = render(<DashboardPage />);

    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders the API error message when a request fails', () => {
    mockedUseGetDashboardSummaryQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Oops' },
    });
    mockedUseGetAnomaliesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });

    render(<DashboardPage />);

    expect(screen.getByText('Oops')).toBeInTheDocument();
  });

  it('renders the KPI block from the deterministic summary', () => {
    mockLoaded();

    render(<DashboardPage />);

    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('Meters')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Anomalies')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Last run')).toBeInTheDocument();
    expect(screen.getByText('latest')).toBeInTheDocument();
  });

  it('renders the anomaly overview with a link to each anomaly detail', () => {
    mockLoaded();

    render(<DashboardPage />);

    expect(screen.getByText('M-101')).toBeInTheDocument();
    expect(screen.getByText('REAL_ANOMALY')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('Unexplained')).toBeInTheDocument();
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
      screen.getByRole('link', { name: 'View all anomalies' }),
    ).toHaveAttribute('href', '/anomalies');
    expect(screen.getByRole('link', { name: 'Browse meters' })).toHaveAttribute(
      'href',
      '/meters',
    );
  });

  it('derives type and severity counts in the browser from the fetched array', () => {
    mockLoaded();

    render(<DashboardPage />);

    expect(screen.getByText('Real anomaly: 1')).toBeInTheDocument();
    expect(screen.getByText('Data quality issue: 1')).toBeInTheDocument();
    expect(screen.getByText('HIGH: 1')).toBeInTheDocument();
    expect(screen.getByText('LOW: 1')).toBeInTheDocument();
  });

  it('renders an empty overview when the backend reports no anomalies', () => {
    mockLoaded({ ...summary, anomalies: 0 }, []);

    render(<DashboardPage />);

    expect(screen.getByText('No anomalies reported.')).toBeInTheDocument();
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
      screen.getByText(/Showing the first 5 of 7 anomalies/),
    ).toBeInTheDocument();
  });
});

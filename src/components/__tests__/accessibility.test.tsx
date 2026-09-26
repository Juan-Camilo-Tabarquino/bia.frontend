import React from 'react';
import { render, screen } from '@testing-library/react';

import Home from '../../app/page';
import MetersPage from '../../app/meters/page';
import DashboardPage from '../../app/dashboard/page';
import MeterPage from '../../app/meter/[id]/page';
import MeterReadingsPage from '../../app/meter/[id]/readings/page';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'meter-123' }),
  redirect: jest.fn(),
}));

jest.mock('@/features/api/apiSlice', () => ({
  useGetMetersQuery: jest.fn(),
  useGetMeterDetailQuery: jest.fn(),
  useGetDashboardSummaryQuery: jest.fn(),
  useGetAnomaliesQuery: jest.fn(),
}));

jest.mock('@/features/data/dataAPI', () => ({
  useGetMeterReadingsQuery: jest.fn(),
}));

// recharts cannot measure a container in jsdom (getBoundingClientRect is 0),
// so render a deterministic stand-in that exposes the props under test.
jest.mock('recharts', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    ResponsiveContainer: ({
      children,
      ...rest
    }: { children?: React.ReactNode } & Record<string, unknown>) =>
      ReactModule.createElement('div', rest, children),
    LineChart: ({
      children,
    }: {
      children?: React.ReactNode;
    }) => ReactModule.createElement('div', null, children),
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
  };
});

import {
  useGetAnomaliesQuery,
  useGetDashboardSummaryQuery,
  useGetMeterDetailQuery,
  useGetMetersQuery,
} from '@/features/api/apiSlice';
import { useGetMeterReadingsQuery } from '@/features/data/dataAPI';
import { redirect } from 'next/navigation';

beforeEach(() => {
  jest.clearAllMocks();

  (useGetMetersQuery as jest.Mock).mockReturnValue({
    data: ['M-101', 'M-102'],
    isLoading: false,
    error: undefined,
  });
  (useGetMeterDetailQuery as jest.Mock).mockReturnValue({
    data: {
      id: 'meter-row-1',
      meter_id: 'M-101',
      name: '',
      location: '',
      status: 'OK',
      created_at: '2024-01-01T00:00:00Z',
      readings_count: 3,
      last_reading_at: '2024-01-03T00:00:00Z',
    },
    isLoading: false,
    error: undefined,
  });
  (useGetDashboardSummaryQuery as jest.Mock).mockReturnValue({
    data: { health: 'ok', meters: 2, anomalies: 0, lastRun: '2024-01-01' },
    isLoading: false,
    error: undefined,
  });
  (useGetAnomaliesQuery as jest.Mock).mockReturnValue({
    data: [],
    isLoading: false,
    error: undefined,
  });
  (useGetMeterReadingsQuery as jest.Mock).mockReturnValue({
    data: [
      {
        MeterID: 'M-101',
        Timestamp: '2024-01-01T00:00:00Z',
        Consumption: 10,
        Voltage: 230,
        Current: 5.4,
        PowerFactor: 0.98,
      },
    ],
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: jest.fn(),
  });
});

const expectSingleH1 = (name: string | RegExp): void => {
  const headings = screen.getAllByRole('heading', { level: 1 });
  expect(headings).toHaveLength(1);
  expect(headings[0]).toHaveAccessibleName(name);
};

describe('accessibility', () => {
  it('redirects the home page to the meters route', () => {
    render(<Home />);

    expect(redirect).toHaveBeenCalledWith('/meters');
  });

  it('renders exactly one h1 on the meters page', () => {
    render(<MetersPage />);

    expectSingleH1('Medidores');
  });

  it('renders exactly one h1 on the dashboard page', () => {
    render(<DashboardPage />);

    expectSingleH1('Dashboard');
  });

  it('renders exactly one h1 on the meter detail page', () => {
    render(<MeterPage />);

    expectSingleH1('Meter meter-123');
  });

  it('renders exactly one h1 on the meter readings page', () => {
    render(<MeterReadingsPage />);

    expectSingleH1('Meter Readings for meter-123');
  });

  it('exposes an accessible name on the readings chart', () => {
    render(<MeterReadingsPage />);

    expect(
      screen.getByRole('img', { name: /Readings chart/i }),
    ).toBeInTheDocument();
  });

  it('exposes an accessible name on the readings table', () => {
    render(<MeterReadingsPage />);

    expect(
      screen.getByRole('table', { name: /Readings table/i }),
    ).toBeInTheDocument();
  });

  it('exposes an accessible name on the readings date range picker', () => {
    render(<MeterReadingsPage />);

    const inputs = screen.getAllByLabelText(/Readings date range/i);

    expect(inputs.length).toBeGreaterThan(0);
  });

  it('exposes the meter id as the accessible name of each meter link', () => {
    render(<MetersPage />);

    expect(screen.getByRole('link', { name: 'M-101' })).toHaveAttribute(
      'href',
      '/meter/M-101',
    );
    expect(screen.getByRole('link', { name: 'M-102' })).toHaveAttribute(
      'href',
      '/meter/M-102',
    );
  });
});

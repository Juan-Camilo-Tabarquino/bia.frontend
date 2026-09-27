import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MeterReadingsPage from '../page';
import { formatDateTime } from '@/components/formatters';
import type { Anomaly, Reading } from '@/types/backend';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'meter-123' }),
}));

jest.mock('@/features/data/dataAPI', () => ({
  useGetMeterReadingsQuery: jest.fn(),
}));

jest.mock('@/features/api/apiSlice', () => ({
  useGetAnomaliesQuery: jest.fn(),
}));

// recharts cannot measure a container in jsdom (getBoundingClientRect is 0),
// so render a deterministic stand-in that exposes the props under test.
jest.mock("recharts", () =>
  (
    jest.requireActual("@/test-support/rechartsMock") as typeof import("@/test-support/rechartsMock")
  ).createRechartsMock(),
);

import { useGetMeterReadingsQuery } from '@/features/data/dataAPI';
import { useGetAnomaliesQuery } from '@/features/api/apiSlice';

const mockedUseGetMeterReadingsQuery = useGetMeterReadingsQuery as jest.Mock;
const mockedUseGetAnomaliesQuery = useGetAnomaliesQuery as jest.Mock;

const refetch = jest.fn();

const readings: Reading[] = [
  {
    MeterID: 'meter-123',
    Timestamp: '2024-01-01T00:00:00Z',
    Consumption: 12.5,
    Voltage: 230,
    Current: 5.4,
    PowerFactor: 0.98,
  },
  {
    MeterID: 'meter-123',
    Timestamp: '2024-01-02T00:00:00Z',
    Consumption: 20,
    Voltage: 231,
    Current: 5.6,
    PowerFactor: 0.97,
  },
];

const anomalies: Anomaly[] = [
  {
    id: 'an-1',
    meter_id: 'meter-123',
    detected_at: '2024-01-01T06:00:00Z',
    type: 'REAL_ANOMALY',
    severity: 'HIGH',
    confidence: 0.9,
    reason: 'Consumption spike',
    recommended_action: 'Inspect the meter',
    status: 'unexplained',
    priority: 1,
    baseline: {
      mean: 12.1,
      stddev: 1.4,
      count: 12,
      voltage_mean: 229.5,
      current_mean: 5.3,
      power_factor_mean: 0.975,
    },
    consumption_change_pct: 65.3,
    voltage_change_pct: 0.4,
    current_change_pct: 3.8,
    power_factor_change_pct: -0.6,
    correlated_events: [],
    data_quality: { flagged: false, reason: '' },
  },
  {
    id: 'an-2',
    meter_id: 'other-meter',
    detected_at: '2024-02-09T00:00:00Z',
    type: 'FALSE_POSITIVE',
    severity: 'LOW',
    confidence: 0.2,
    reason: 'Sensor drift',
    recommended_action: 'No action required',
    status: 'explained',
    priority: 2,
    baseline: {
      mean: 30.0,
      stddev: 2.1,
      count: 24,
      voltage_mean: 230.1,
      current_mean: 5.5,
      power_factor_mean: 0.98,
    },
    consumption_change_pct: -12.4,
    voltage_change_pct: -1.1,
    current_change_pct: -2.5,
    power_factor_change_pct: 1.2,
    correlated_events: [],
    data_quality: { flagged: false, reason: '' },
  },
];

const plottedPoints = (): Array<Record<string, unknown>> =>
  JSON.parse(
    screen.getByTestId('line-chart').getAttribute('data-points') ?? '[]',
  ) as Array<Record<string, unknown>>;

describe('MeterReadingsPage', () => {
  beforeEach(() => {
    mockedUseGetMeterReadingsQuery.mockReset();
    mockedUseGetAnomaliesQuery.mockReset();
    refetch.mockReset();
    mockedUseGetMeterReadingsQuery.mockReturnValue({
      data: readings,
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch,
    });
    mockedUseGetAnomaliesQuery.mockReturnValue({
      data: anomalies,
      isLoading: false,
      error: undefined,
    });
  });

  it('queries the readings for the routed meter id without skipping', () => {
    render(<MeterReadingsPage />);

    expect(mockedUseGetMeterReadingsQuery).toHaveBeenCalledWith(
      { meterId: 'meter-123' },
      { skip: false },
    );
  });

  it('reads the anomaly list so this meter can be marked on the timeline', () => {
    render(<MeterReadingsPage />);

    expect(mockedUseGetAnomaliesQuery).toHaveBeenCalled();
  });

  it('renders the heading, chart and table', () => {
    render(<MeterReadingsPage />);

    expect(
      screen.getByRole('heading', { name: /Lecturas del medidor meter-123/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Gráfico de lecturas: Consumo/)).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows a non-blocking updating indicator during a refetch, keeping the rows', () => {
    // RTK Query keeps the previous `data` and reports `isFetching` while a
    // refetch is in flight, so the indicator must appear without blanking the
    // chart or table.
    mockedUseGetMeterReadingsQuery.mockReturnValue({
      data: readings,
      isLoading: false,
      isFetching: true,
      error: undefined,
      refetch,
    });

    render(<MeterReadingsPage />);

    expect(screen.getByText('Actualizando…')).toBeInTheDocument();
    expect(screen.getByLabelText(/Gráfico de lecturas: Consumo/)).toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
  });

  it('hides the updating indicator when no refetch is in flight', () => {
    render(<MeterReadingsPage />);

    expect(screen.queryByText('Actualizando…')).not.toBeInTheDocument();
  });

  it('renders a retryable error when the readings request fails', () => {
    mockedUseGetMeterReadingsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { message: 'Explotó' },
      refetch,
    });

    render(<MeterReadingsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Explotó');
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('forwards a selected date range as from/to query params', () => {
    render(<MeterReadingsPage />);

    const start = screen.getByPlaceholderText('Start date');
    const end = screen.getByPlaceholderText('End date');

    fireEvent.mouseDown(start);
    fireEvent.change(start, { target: { value: '2024-01-01' } });
    fireEvent.keyDown(start, { key: 'Enter', code: 'Enter', keyCode: 13 });

    fireEvent.mouseDown(end);
    fireEvent.change(end, { target: { value: '2024-01-10' } });
    fireEvent.keyDown(end, { key: 'Enter', code: 'Enter', keyCode: 13 });

    const lastCall = mockedUseGetMeterReadingsQuery.mock.calls.at(-1);
    const range = lastCall?.[0] as { meterId: string; from: string; to: string };

    // Assert the forwarded values describe the picked local dates, independent
    // of the runner timezone (dayjs picks local midnight, then serializes to UTC).
    expect(range.meterId).toBe('meter-123');
    expect(Number.isNaN(Date.parse(range.from))).toBe(false);
    expect(Number.isNaN(Date.parse(range.to))).toBe(false);
    expect(new Date(range.from).getFullYear()).toBe(2024);
    expect(new Date(range.from).getMonth()).toBe(0);
    expect(new Date(range.from).getDate()).toBe(1);
    expect(new Date(range.to).getDate()).toBe(10);
    expect(lastCall?.[1]).toEqual({ skip: false });
  });

  it('renders an empty readings state when the backend answers 200 null', () => {
    // `GET /meters/{id}/readings` replies `200 null` for an unknown meter or an
    // empty window, so the page must narrow the payload instead of mapping it
    // and must explain the empty chart region.
    mockedUseGetMeterReadingsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch,
    });

    render(<MeterReadingsPage />);

    expect(
      screen.getByRole('heading', { name: /Lecturas del medidor meter-123/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No hay lecturas en el rango seleccionado.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(/Error loading readings/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: /Gráfico de lecturas/i }),
    ).not.toBeInTheDocument();
  });

  it('forwards every signal of the Reading payload without collapsing it', () => {
    render(<MeterReadingsPage />);

    // The four signals survive to the table cells with their own units, so the
    // old `Consumption -> value` reduction is gone. The timestamp cell now uses
    // the shared local format instead of the raw wire string.
    expect(
      screen.getByText(formatDateTime('2024-01-01T00:00:00Z')),
    ).toBeInTheDocument();
    expect(screen.queryByText('2024-01-01T00:00:00Z')).not.toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
    expect(screen.getByText('230')).toBeInTheDocument();
    expect(screen.getByText('5.4')).toBeInTheDocument();
    expect(screen.getByText('0.98')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Voltaje (V)' })).toBeInTheDocument();
  });

  it('marks only the anomalies of this meter on the timeline', () => {
    render(<MeterReadingsPage />);

    // `GET /api/anomalies` has no per-meter query, so the page filters the full
    // list client-side: only `meter-123` records reach the chart.
    const markedPoints = plottedPoints().filter(
      (point) => point.anomalyValue !== null,
    );
    expect(markedPoints).toHaveLength(1);
    expect(markedPoints[0].Timestamp).toBe('2024-01-01T00:00:00Z');

    // The marker list prints the shared local format, never the raw timestamp.
    expect(
      screen.getByText(formatDateTime('2024-01-01T06:00:00Z')),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/HIGH · Anomalía real/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText(formatDateTime('2024-02-09T00:00:00Z')),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('2024-01-01T06:00:00Z')).not.toBeInTheDocument();
  });

  it('carries the anomaly baseline mean into the chart reference line', () => {
    render(<MeterReadingsPage />);

    // `Anomaly.baseline.mean` used to be dropped when the page mapped the
    // anomalies; it now reaches the chart as the consumption reference line.
    const lines = screen.getAllByTestId('reference-line');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveAttribute('data-y', '12.1');
  });

  // SHAPE PROXY, not an alignment check. jsdom loads no stylesheets, so the real
  // 144 px content edge (E2) is unobservable here; what this pins is the shape
  // the fix introduced: the antd Row owns the VERTICAL padding only and adds no
  // horizontal padding of its own. The Row's `gutter` still contributes
  // `margin-inline:-8px` and each Col `padding-inline:8px`, so the title edge is
  //   144 - 8 + 0 + 8 = 144.
  // Restoring `padding: "1rem"` on the Row makes this fail.
  it('leaves the horizontal gutter to the shell and keeps only vertical padding', () => {
    render(<MeterReadingsPage />);

    const row = screen.getByRole('heading', { level: 1 }).closest('.ant-row');
    expect(row).not.toBeNull();
    expect((row as HTMLElement).style.paddingBlock).toBe('1rem');
    expect((row as HTMLElement).style.padding).toBe('');
    expect((row as HTMLElement).style.paddingLeft).toBe('');
    expect((row as HTMLElement).style.paddingRight).toBe('');
    expect((row as HTMLElement).style.paddingInline).toBe('');
  });
});

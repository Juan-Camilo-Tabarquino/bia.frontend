import React, { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MeterList } from '../MeterList';
import type { Anomaly, MeterSummary } from '@/types/backend';

jest.mock('@/features/api/apiSlice', () => ({
  useGetMetersQuery: jest.fn(),
  useGetAnomaliesQuery: jest.fn(),
}));

import {
  useGetAnomaliesQuery,
  useGetMetersQuery,
} from '@/features/api/apiSlice';

const mockedUseGetMetersQuery = useGetMetersQuery as jest.Mock;
const mockedUseGetAnomaliesQuery = useGetAnomaliesQuery as jest.Mock;

const refetch = jest.fn();

// `GET /api/meters` answers objects now, so the cards read their status, their
// consumption and their last reading straight from this array instead of
// issuing one `GET /meters/{id}` each.
const meters: MeterSummary[] = [
  {
    id: 'M-109',
    consumption: 2180.4,
    status: 'OK',
    readings_count: 336,
    last_reading_at: '2026-09-12T14:00:00Z',
  },
  {
    id: 'M-111',
    consumption: 900,
    status: 'DEGRADED',
    readings_count: 300,
    last_reading_at: '2026-09-11T14:00:00Z',
  },
  {
    id: 'M-112',
    consumption: 3000.5,
    status: 'OK',
    readings_count: 336,
    last_reading_at: '2026-09-10T14:00:00Z',
  },
];

/** The anomaly shape both the join and the card read; ids are set per fixture. */
const baseAnomaly: Anomaly = {
  id: 'a-base',
  meter_id: 'M-109',
  detected_at: '2026-09-12T14:00:00Z',
  type: 'REAL_ANOMALY',
  severity: 'HIGH',
  confidence: 0.97,
  reason: 'Sudden consumption spike',
  recommended_action: 'Inspect the meter',
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
};

/** M-109 is HIGH, M-111 is MEDIUM and M-112 has no anomaly at all. */
const anomalies: Anomaly[] = [
  baseAnomaly,
  {
    ...baseAnomaly,
    id: 'a-med',
    meter_id: 'M-111',
    severity: 'MEDIUM',
    priority: 2,
    consumption_change_pct: -26.42,
  },
];

function mockMeters(data: MeterSummary[]): void {
  mockedUseGetMetersQuery.mockReturnValue({
    data,
    isLoading: false,
    error: undefined,
    refetch,
  });
}

function mockAnomalies(data: Anomaly[]): void {
  mockedUseGetAnomaliesQuery.mockReturnValue({
    data,
    isLoading: false,
    error: undefined,
    refetch,
  });
}

/** The rendered cards in DOM order, read off their single id link. */
function linkNames(): string[] {
  return screen.getAllByRole('link').map((link) => link.textContent ?? '');
}

describe('MeterList component', () => {
  beforeEach(() => {
    refetch.mockReset();
    mockedUseGetMetersQuery.mockReset();
    mockedUseGetAnomaliesQuery.mockReset();
    mockMeters(meters);
    mockAnomalies(anomalies);
  });

  it('renders a skeleton while the meters request is pending', () => {
    mockedUseGetMetersQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch,
    });

    const { container } = render(<MeterList />);

    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
  });

  it('renders the API error message with a retry action when the request fails', () => {
    mockedUseGetMetersQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Fail' },
      refetch,
    });

    render(<MeterList />);

    expect(screen.getByRole('alert')).toHaveTextContent('Fail');
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  // The retry action must show that a retry is actually running. A disabled
  // control alone would not prove the flag is wired, so the enabled case is
  // asserted too: together they can only pass if `isFetching` reaches the prop.
  it('disables the retry action while the meters refetch is in flight', () => {
    mockedUseGetMetersQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true,
      error: { message: 'Fail' },
      refetch,
    });

    render(<MeterList />);

    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeDisabled();
  });

  it('keeps the retry action enabled when the meters request is not refetching', () => {
    mockedUseGetMetersQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { message: 'Fail' },
      refetch,
    });

    render(<MeterList />);

    expect(
      screen.getByRole('button', { name: /Reintentar/ }),
    ).not.toBeDisabled();
  });

  it('renders an empty state when the backend reports no meters', () => {
    mockMeters([]);

    render(<MeterList />);

    expect(
      screen.getByText('No hay medidores para mostrar.'),
    ).toBeInTheDocument();
    // No meters means the search, the filter and the sort have nothing to act
    // on, so none of them is rendered.
    expect(screen.queryByLabelText('Buscar medidor')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Críticas' })).toBeNull();
  });

  it('renders each meter id as a link to its detail route', () => {
    render(<MeterList />);

    expect(screen.getByRole('link', { name: 'M-109' })).toHaveAttribute(
      'href',
      '/meter/M-109',
    );
    expect(screen.getByRole('link', { name: 'M-112' })).toHaveAttribute(
      'href',
      '/meter/M-112',
    );
  });

  it('renders the consumption, the variation and the severity badge from the two lists', () => {
    render(<MeterList />);

    expect(screen.getByText('2180.4 kWh')).toBeInTheDocument();
    expect(screen.getByText('+125.3%')).toBeInTheDocument();
    expect(screen.getByText('HIGH · Alta')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM · Media')).toBeInTheDocument();
    // M-112 has no anomaly in the fetched list, and the card says so instead of
    // borrowing another meter's numbers.
    expect(screen.getByText('Sin anomalías')).toBeInTheDocument();
  });

  it('filters the list by a case-insensitive substring typed into the search box', async () => {
    render(<MeterList />);

    // Lowercase input must still find the uppercase ids.
    fireEvent.change(screen.getByLabelText('Buscar medidor'), {
      target: { value: 'm-11' },
    });

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'M-109' })).toBeNull();
    });
    expect(screen.getByRole('link', { name: 'M-111' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'M-112' })).toBeInTheDocument();
    expect(
      screen.getByText('Mostrando 2 de 3 medidores.'),
    ).toBeInTheDocument();
  });

  it('shows every meter for an empty or whitespace-only query', async () => {
    render(<MeterList />);

    fireEvent.change(screen.getByLabelText('Buscar medidor'), {
      target: { value: '   ' },
    });

    await waitFor(() => {
      expect(
        screen.getByText('Mostrando 3 de 3 medidores.'),
      ).toBeInTheDocument();
    });
    expect(linkNames()).toHaveLength(3);
  });

  it('shows the search empty state, not the backend empty state, when nothing matches', async () => {
    render(<MeterList />);

    fireEvent.change(screen.getByLabelText('Buscar medidor'), {
      target: { value: 'zzz' },
    });

    await waitFor(() => {
      expect(
        screen.getByText('Ningún medidor coincide con la búsqueda.'),
      ).toBeInTheDocument();
    });
    // The backend did return meters: the list is empty because of the search.
    expect(
      screen.queryByText('No hay medidores para mostrar.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 0 de 3 medidores.')).toBeInTheDocument();
  });

  // The four buckets and the three orderings are the whole point of the join:
  // both read the anomaly the browser matched by `meter_id`, so a bucket or an
  // ordering that silently read only `/meters` would still render, but would
  // rank and select the wrong cards.
  it('buckets the cards by the joined severity and orders them on demand', () => {
    render(<MeterList />);

    const choose = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));

    // `Todos` is the default: the API order, untouched.
    expect(linkNames()).toEqual(['M-109', 'M-111', 'M-112']);

    choose('Críticas');
    expect(linkNames()).toEqual(['M-109']);
    expect(screen.getByText('Mostrando 1 de 3 medidores.')).toBeInTheDocument();

    choose('Alertas');
    expect(linkNames()).toEqual(['M-111']);

    // The meter with no joined anomaly is the only "normal" one.
    choose('Normales');
    expect(linkNames()).toEqual(['M-112']);

    choose('Todos');
    expect(linkNames()).toEqual(['M-109', 'M-111', 'M-112']);

    // Consumption, largest first: M-112 (3000.5) > M-109 (2180.4) > M-111 (900).
    choose('Consumo');
    expect(linkNames()).toEqual(['M-112', 'M-109', 'M-111']);

    // Severity, most severe first, and a meter with no anomaly sorts last --
    // never at the head by a numeric accident.
    choose('Severidad');
    expect(linkNames()).toEqual(['M-109', 'M-111', 'M-112']);

    // Variation, largest increase first: M-109 (+125.28) > M-111 (-26.42) >
    // M-112, which has no variation at all.
    choose('Variación');
    expect(linkNames()).toEqual(['M-109', 'M-111', 'M-112']);

    // Back to the untouched API order.
    choose('Orden del backend');
    expect(linkNames()).toEqual(['M-109', 'M-111', 'M-112']);
  });

  it('keeps the search working under StrictMode\'s double-invoked effects', async () => {
    render(
      <StrictMode>
        <MeterList />
      </StrictMode>,
    );

    fireEvent.change(screen.getByLabelText('Buscar medidor'), {
      target: { value: 'm-112' },
    });

    await waitFor(() => {
      expect(
        screen.getByText('Mostrando 1 de 3 medidores.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'M-112' })).toBeInTheDocument();
  });
});

import React, { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MeterList } from '../MeterList';

jest.mock('@/features/api/apiSlice', () => ({
  useGetMetersQuery: jest.fn(),
  useGetMeterDetailQuery: jest.fn(),
}));

import {
  useGetMeterDetailQuery,
  useGetMetersQuery,
} from '@/features/api/apiSlice';

const mockedUseGetMetersQuery = useGetMetersQuery as jest.Mock;
const mockedUseGetMeterDetailQuery = useGetMeterDetailQuery as jest.Mock;

const refetch = jest.fn();

// The card renders estado and última lectura from its own detail query, so the
// list suite needs a resolved detail to keep every card on its happy path.
const detail = {
  id: 'meter-row-1',
  meter_id: 'M-101',
  name: '',
  location: '',
  status: 'OK' as const,
  created_at: '2024-01-01T00:00:00Z',
  readings_count: 12,
  last_reading_at: '2024-01-10T00:00:00Z',
};

describe('MeterList component', () => {
  beforeEach(() => {
    refetch.mockReset();
    mockedUseGetMetersQuery.mockReset();
    mockedUseGetMeterDetailQuery.mockReset();
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: detail,
      isLoading: false,
      error: undefined,
    });
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
    mockedUseGetMetersQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
      refetch,
    });

    render(<MeterList />);

    expect(
      screen.getByText('No hay medidores para mostrar.'),
    ).toBeInTheDocument();
  });

  it('renders each meter id as a link to its detail route', () => {
    const meters = ['M-101', 'M-102'];
    mockedUseGetMetersQuery.mockReturnValue({
      data: meters,
      isLoading: false,
      error: undefined,
      refetch,
    });

    render(<MeterList />);

    expect(screen.getByRole('link', { name: 'M-101' })).toHaveAttribute(
      'href',
      '/meter/M-101',
    );
    expect(screen.getByRole('link', { name: 'M-102' })).toHaveAttribute(
      'href',
      '/meter/M-102',
    );
  });

  function mockMeters(data: string[]): void {
    mockedUseGetMetersQuery.mockReturnValue({
      data,
      isLoading: false,
      error: undefined,
      refetch,
    });
  }

  it('filters the list by a case-insensitive substring typed into the search box', async () => {
    mockMeters(['M-101', 'M-102', 'M-201']);

    render(<MeterList />);

    // Lowercase input must still find the uppercase ids.
    fireEvent.change(screen.getByLabelText('Buscar medidor'), {
      target: { value: 'm-10' },
    });

    await waitFor(() => {
      expect(
        screen.queryByRole('link', { name: 'M-201' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'M-101' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'M-102' })).toBeInTheDocument();
    expect(
      screen.getByText('Mostrando 2 de 3 medidores.'),
    ).toBeInTheDocument();
  });

  it('shows every meter for an empty or whitespace-only query', async () => {
    mockMeters(['M-101', 'M-102']);

    render(<MeterList />);

    fireEvent.change(screen.getByLabelText('Buscar medidor'), {
      target: { value: '   ' },
    });

    await waitFor(() => {
      expect(
        screen.getByText('Mostrando 2 de 2 medidores.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'M-101' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'M-102' })).toBeInTheDocument();
  });

  it('shows the search empty state, not the backend empty state, when nothing matches', async () => {
    mockMeters(['M-101', 'M-102']);

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
    expect(
      screen.getByText('Mostrando 0 de 2 medidores.'),
    ).toBeInTheDocument();
  });

  // `GET /api/meters` returns bare ids and there is no bulk detail endpoint, so
  // each rendered card fetches its own detail. The whole point is that the
  // fetch follows the VISIBLE set: narrowing many ids down to a couple must
  // cost a couple of detail calls, not one per backend id.
  it('fetches detail only for the visible cards after filtering', async () => {
    const many = [
      ...Array.from({ length: 100 }, (_, index) => `M-${200 + index}`),
      'OBJETIVO-1',
      'OBJETIVO-2',
    ];
    mockMeters(many);

    render(<MeterList />);

    fireEvent.change(screen.getByLabelText('Buscar medidor'), {
      target: { value: 'OBJETIVO' },
    });

    // The keystroke re-renders the still-unfiltered list before the debounce
    // settles. Drop those calls so the measurement covers only the settled,
    // filtered render — the one whose visible set is under test.
    mockedUseGetMeterDetailQuery.mockClear();

    await waitFor(() => {
      expect(
        screen.getByText('Mostrando 2 de 102 medidores.'),
      ).toBeInTheDocument();
    });

    const requestedIds = new Set(
      mockedUseGetMeterDetailQuery.mock.calls.map((call) => call[0]),
    );
    expect([...requestedIds].sort()).toEqual(['OBJETIVO-1', 'OBJETIVO-2']);
    expect(requestedIds.size).toBe(2);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('keeps the search working under StrictMode\'s double-invoked effects', async () => {
    mockMeters(['M-101', 'M-102']);

    render(
      <StrictMode>
        <MeterList />
      </StrictMode>,
    );

    fireEvent.change(screen.getByLabelText('Buscar medidor'), {
      target: { value: 'm-102' },
    });

    await waitFor(() => {
      expect(
        screen.getByText('Mostrando 1 de 2 medidores.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'M-102' })).toBeInTheDocument();
  });
});

import React, { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MeterList } from '../MeterList';

jest.mock('@/features/api/apiSlice', () => ({
  useGetMetersQuery: jest.fn(),
}));

import { useGetMetersQuery } from '@/features/api/apiSlice';

const mockedUseGetMetersQuery = useGetMetersQuery as jest.Mock;

const refetch = jest.fn();

describe('MeterList component', () => {
  beforeEach(() => {
    refetch.mockReset();
    mockedUseGetMetersQuery.mockReset();
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

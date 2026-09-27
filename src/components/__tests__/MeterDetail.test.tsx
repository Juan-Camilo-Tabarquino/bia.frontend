import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MeterDetail from '../MeterDetail';
import { formatDateTime } from '@/components/formatters';

jest.mock('@/features/api/apiSlice', () => ({
  useGetMeterDetailQuery: jest.fn(),
}));

import { useGetMeterDetailQuery } from '@/features/api/apiSlice';

const mockedUseGetMeterDetailQuery = useGetMeterDetailQuery as jest.Mock;

const refetch = jest.fn();

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

describe('MeterDetail component', () => {
  beforeEach(() => {
    refetch.mockReset();
    mockedUseGetMeterDetailQuery.mockReset();
  });

  it('passes the string meter id to the detail query', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: undefined,
      refetch,
    });

    render(<MeterDetail meterId="meter-123" />);

    expect(mockedUseGetMeterDetailQuery).toHaveBeenCalledWith('meter-123');
  });

  it('renders a skeleton while loading', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: undefined,
      refetch,
    });

    const { container } = render(<MeterDetail meterId="meter-123" />);

    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
  });

  it('renders the API error message with a retry action when the request fails', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { message: 'Boom' },
      refetch,
    });

    render(<MeterDetail meterId="meter-123" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders a not-found state, not a generic error, on a 404', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { status: 404, data: { error: 'meter not found' } },
      refetch,
    });

    render(<MeterDetail meterId="meter-123" />);

    expect(screen.getByText('Medidor no encontrado')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Volver a medidores' }),
    ).toHaveAttribute('href', '/meters');
  });

  it('renders a not-found state when the transformed status is 404', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { originalStatus: 404 },
      refetch,
    });

    render(<MeterDetail meterId="meter-123" />);

    expect(screen.getByText('Medidor no encontrado')).toBeInTheDocument();
  });

  it('renders the meter detail fields from the payload', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: detail,
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch,
    });

    render(<MeterDetail meterId="meter-123" />);

    expect(screen.getByText('Detalles del medidor')).toBeInTheDocument();
    expect(screen.getByText('M-101')).toBeInTheDocument();
    expect(screen.getByText('OK · Operativo')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    // Both timestamps render the shared local format and not the wire string.
    expect(
      screen.getByText(formatDateTime('2024-01-01T00:00:00Z')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatDateTime('2024-01-10T00:00:00Z')),
    ).toBeInTheDocument();
    expect(screen.queryByText('2024-01-01T00:00:00Z')).not.toBeInTheDocument();
    expect(screen.queryByText('2024-01-10T00:00:00Z')).not.toBeInTheDocument();
  });

  it('renders the DEGRADED member of the meter status map', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: { ...detail, status: 'DEGRADED' as const },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch,
    });

    render(<MeterDetail meterId="meter-123" />);

    // The raw wire value stays visible next to the Spanish label.
    expect(screen.getByText('DEGRADED · Degradado')).toBeInTheDocument();
  });

  it('links to the meter readings and to its filtered anomalies', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: detail,
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch,
    });

    render(<MeterDetail meterId="M-101" />);

    expect(screen.getByRole('link', { name: 'Ver lecturas' })).toHaveAttribute(
      'href',
      '/meter/M-101/readings',
    );
    expect(screen.getByRole('link', { name: 'Ver anomalías' })).toHaveAttribute(
      'href',
      '/anomalies?meter_id=M-101',
    );
  });
});

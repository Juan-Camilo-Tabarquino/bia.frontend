import React from 'react';
import { render, screen } from '@testing-library/react';
import MeterDetail from '../MeterDetail';

jest.mock('@/features/api/apiSlice', () => ({
  useGetMeterDetailQuery: jest.fn(),
}));

import { useGetMeterDetailQuery } from '@/features/api/apiSlice';

const mockedUseGetMeterDetailQuery = useGetMeterDetailQuery as jest.Mock;

describe('MeterDetail component', () => {
  beforeEach(() => {
    mockedUseGetMeterDetailQuery.mockReset();
  });

  it('passes the string meter id to the detail query', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    render(<MeterDetail meterId="meter-123" />);

    expect(mockedUseGetMeterDetailQuery).toHaveBeenCalledWith('meter-123');
  });

  it('renders a loading spinner', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    const { container } = render(<MeterDetail meterId="meter-123" />);

    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders the API error message when the request fails', () => {
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Boom' },
    });

    render(<MeterDetail meterId="meter-123" />);

    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('renders the meter detail fields from the payload', () => {
    const data = {
      id: 'meter-row-1',
      meter_id: 'M-101',
      name: '',
      location: '',
      status: 'OK' as const,
      created_at: '2024-01-01T00:00:00Z',
      readings_count: 12,
      last_reading_at: '2024-01-10T00:00:00Z',
    };
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data,
      isLoading: false,
      error: undefined,
    });

    render(<MeterDetail meterId="meter-123" />);

    expect(screen.getByText('Meter Details')).toBeInTheDocument();
    expect(screen.getByText('M-101')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01T00:00:00Z')).toBeInTheDocument();
    expect(screen.getByText('2024-01-10T00:00:00Z')).toBeInTheDocument();
  });

  it('links to the meter readings and to its filtered anomalies', () => {
    const data = {
      id: 'meter-row-1',
      meter_id: 'M-101',
      name: '',
      location: '',
      status: 'OK' as const,
      created_at: '2024-01-01T00:00:00Z',
      readings_count: 12,
      last_reading_at: '2024-01-10T00:00:00Z',
    };
    mockedUseGetMeterDetailQuery.mockReturnValue({
      data,
      isLoading: false,
      error: undefined,
    });

    render(<MeterDetail meterId="M-101" />);

    expect(screen.getByRole('link', { name: 'View readings' })).toHaveAttribute(
      'href',
      '/meter/M-101/readings',
    );
    expect(screen.getByRole('link', { name: 'View anomalies' })).toHaveAttribute(
      'href',
      '/anomalies?meter_id=M-101',
    );
  });
});

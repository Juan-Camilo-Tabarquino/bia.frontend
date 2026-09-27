import React, { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { MeterCard } from '../MeterCard';
import { formatDateTime } from '@/components/formatters';
import type { MeterDetail } from '@/types/backend';

jest.mock('@/features/api/apiSlice', () => ({
  useGetMeterDetailQuery: jest.fn(),
}));

import { useGetMeterDetailQuery } from '@/features/api/apiSlice';

const mockedUseGetMeterDetailQuery = useGetMeterDetailQuery as jest.Mock;

const detail: MeterDetail = {
  id: 'meter-row-1',
  meter_id: 'M-101',
  name: '',
  location: '',
  status: 'OK',
  created_at: '2024-01-01T00:00:00Z',
  readings_count: 12,
  last_reading_at: '2024-01-10T00:00:00Z',
};

function mockDetail(
  value: Partial<{
    data: typeof detail | undefined;
    isLoading: boolean;
    error: unknown;
  }>,
): void {
  mockedUseGetMeterDetailQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: undefined,
    ...value,
  });
}

describe('MeterCard component', () => {
  beforeEach(() => {
    mockedUseGetMeterDetailQuery.mockReset();
  });

  it('queries the detail endpoint for its own meter id', () => {
    mockDetail({ data: detail });

    render(<MeterCard meterId="M-101" />);

    expect(mockedUseGetMeterDetailQuery).toHaveBeenCalledWith('M-101');
  });

  // The accessible name must stay exactly the id and nothing else: the status
  // and the last reading live outside the anchor, never inside it.
  it('exposes exactly the meter id as the only link name', () => {
    mockDetail({ data: detail });

    render(<MeterCard meterId="M-101" />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('M-101');
    expect(links[0]).toHaveTextContent(/^M-101$/);
    expect(links[0]).toHaveAttribute('href', '/meter/M-101');
  });

  it('encodes the meter id in the link href', () => {
    mockDetail({ data: detail });

    render(<MeterCard meterId="M-101 / A" />);

    expect(screen.getByRole('link', { name: 'M-101 / A' })).toHaveAttribute(
      'href',
      '/meter/M-101%20%2F%20A',
    );
  });

  it('renders the Spanish status label and the formatted last reading', () => {
    mockDetail({ data: detail });

    render(<MeterCard meterId="M-101" />);

    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Operativo')).toBeInTheDocument();
    expect(screen.getByText('Última lectura')).toBeInTheDocument();
    expect(
      screen.getByText(formatDateTime('2024-01-10T00:00:00Z')),
    ).toBeInTheDocument();
    // The raw wire value never replaces the Spanish label.
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('renders the DEGRADED member of the meter status map', () => {
    mockDetail({ data: { ...detail, status: 'DEGRADED' as const } });

    render(<MeterCard meterId="M-101" />);

    expect(screen.getByText('Degradado')).toBeInTheDocument();
  });

  it('keeps the id link while the detail is loading', () => {
    mockDetail({ data: undefined, isLoading: true });

    const { container } = render(<MeterCard meterId="M-101" />);

    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'M-101' })).toHaveAttribute(
      'href',
      '/meter/M-101',
    );
  });

  it('keeps the id link when the detail request fails', () => {
    mockDetail({ data: undefined, isLoading: false, error: { message: 'Boom' } });

    render(<MeterCard meterId="M-101" />);

    expect(screen.getByRole('link', { name: 'M-101' })).toHaveAttribute(
      'href',
      '/meter/M-101',
    );
    expect(
      screen.getByText('No se pudo cargar el detalle.'),
    ).toBeInTheDocument();
    // The error state must not add a second tab stop to the card.
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the resolved card under StrictMode', () => {
    mockDetail({ data: detail });

    render(
      <StrictMode>
        <MeterCard meterId="M-101" />
      </StrictMode>,
    );

    expect(screen.getByRole('link', { name: 'M-101' })).toBeInTheDocument();
    expect(screen.getByText('Operativo')).toBeInTheDocument();
  });
});

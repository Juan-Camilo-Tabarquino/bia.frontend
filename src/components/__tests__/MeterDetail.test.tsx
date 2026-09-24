import React from 'react';
import { render, screen } from '@testing-library/react';
import MeterDetail from '../../components/MeterDetail';

jest.mock('../../features/api/apiSlice', () => ({
  useGetMeterDetailQuery: jest.fn(),
}));

import { useGetMeterDetailQuery } from '../../features/api/apiSlice';

describe('MeterDetail component', () => {
  it('renders loading spinner', () => {
    (useGetMeterDetailQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, error: undefined });
    render(<MeterDetail meterId="m1" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error message', () => {
    (useGetMeterDetailQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Boom' } });
    render(<MeterDetail meterId="m1" />);
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('renders description items', () => {
    const data = { name: 'Meter One', value: 123 };
    (useGetMeterDetailQuery as jest.Mock).mockReturnValue({ data, isLoading: false, error: undefined });
    render(<MeterDetail meterId="m1" />);
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Meter One')).toBeInTheDocument();
    expect(screen.getByText('value')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });
});

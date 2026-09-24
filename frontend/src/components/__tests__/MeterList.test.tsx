import React from 'react';
import { render, screen } from '@testing-library/react';
import { MeterList } from '../../components/MeterList';

jest.mock('../../features/api/apiSlice', () => ({
  useGetMetersQuery: jest.fn(),
}));

import { useGetMetersQuery } from '../../features/api/apiSlice';

describe('MeterList component', () => {
  it('renders loading spinner', () => {
    (useGetMetersQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, error: undefined });
    render(<MeterList />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument(); // Antd Spin has role progressbar
  });

  it('renders error message', () => {
    (useGetMetersQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Fail' } });
    render(<MeterList />);
    expect(screen.getByText('Fail')).toBeInTheDocument();
  });

  it('renders list of meters', () => {
    const meters = [{ id: 'm1' }, { id: 'm2' }];
    (useGetMetersQuery as jest.Mock).mockReturnValue({ data: meters, isLoading: false, error: undefined });
    render(<MeterList />);
    expect(screen.getByText('m1')).toBeInTheDocument();
    expect(screen.getByText('m2')).toBeInTheDocument();
  });
});

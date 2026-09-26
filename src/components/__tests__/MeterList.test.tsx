import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
});

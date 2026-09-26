import React from 'react';
import { render, screen } from '@testing-library/react';
import { MeterList } from '../MeterList';

jest.mock('@/features/api/apiSlice', () => ({
  useGetMetersQuery: jest.fn(),
}));

import { useGetMetersQuery } from '@/features/api/apiSlice';

const mockedUseGetMetersQuery = useGetMetersQuery as jest.Mock;

describe('MeterList component', () => {
  beforeEach(() => {
    mockedUseGetMetersQuery.mockReset();
  });

  it('renders a loading spinner while the meters request is pending', () => {
    mockedUseGetMetersQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    const { container } = render(<MeterList />);

    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders the API error message when the request fails', () => {
    mockedUseGetMetersQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Fail' },
    });

    render(<MeterList />);

    expect(screen.getByText('Fail')).toBeInTheDocument();
  });

  it('renders each meter id as a link to its detail route', () => {
    const meters = ['M-101', 'M-102'];
    mockedUseGetMetersQuery.mockReturnValue({
      data: meters,
      isLoading: false,
      error: undefined,
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

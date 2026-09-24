import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '../../app/dashboard/page';

jest.mock('../../features/api/apiSlice', () => ({
  useGetAnalysisQuery: jest.fn(),
}));

import { useGetAnalysisQuery } from '../../features/api/apiSlice';

describe('DashboardPage component', () => {
  it('renders loading spinner', () => {
    (useGetAnalysisQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, error: undefined });
    render(<DashboardPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error message', () => {
    (useGetAnalysisQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Oops' } });
    render(<DashboardPage />);
    expect(screen.getByText('Oops')).toBeInTheDocument();
  });

  it('renders chart panel and analyzer', () => {
    const data = { chartData: [], summary: 'ok', anomalies: [], toolOutput: null };
    (useGetAnalysisQuery as jest.Mock).mockReturnValue({ data, isLoading: false, error: undefined });
    render(<DashboardPage />);
    // ChartPanel and Analyzer render inner content – we just verify they appear via their presence in DOM
    expect(screen.queryByText('ok')).toBeInTheDocument();
  });
});

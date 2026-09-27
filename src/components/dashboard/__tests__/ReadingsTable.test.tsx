import React from 'react';
import { render, screen, within } from '@testing-library/react';
import ReadingsTable from '../ReadingsTable';
import { formatDateTime } from '@/components/formatters';
import type { Reading } from '@/types/backend';

const sampleData: Reading[] = [
  {
    MeterID: 'M-101',
    Timestamp: '2024-01-01T00:00:00Z',
    Consumption: 12.5,
    Voltage: 230,
    Current: 5.4,
    PowerFactor: 0.98,
  },
  {
    MeterID: 'M-101',
    Timestamp: '2024-01-02T00:00:00Z',
    Consumption: 15,
    Voltage: 231,
    Current: 5.6,
    PowerFactor: 0.97,
  },
];

describe('ReadingsTable', () => {
  it('renders a skeleton while loading', () => {
    const { container } = render(<ReadingsTable data={[]} loading={true} />);

    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
  });

  it('renders every signal of each reading with its unit in the header', () => {
    render(<ReadingsTable data={sampleData} loading={false} />);

    expect(screen.getByRole('columnheader', { name: 'Timestamp' })).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Consumption (kWh)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Voltage (V)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Current (A)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Power factor' }),
    ).toBeInTheDocument();

    // The Timestamp column now renders the shared local-time format, so the raw
    // wire value must be gone from the cells while every signal stays verbatim.
    expect(
      screen.getByText(formatDateTime('2024-01-01T00:00:00Z')),
    ).toBeInTheDocument();
    expect(screen.queryByText('2024-01-01T00:00:00Z')).not.toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
    expect(screen.getByText('230')).toBeInTheDocument();
    expect(screen.getByText('5.4')).toBeInTheDocument();
    expect(screen.getByText('0.98')).toBeInTheDocument();
  });

  it('names the table from the columns it actually renders', () => {
    render(<ReadingsTable data={sampleData} loading={false} />);

    expect(
      screen.getByRole('table', {
        name: /Timestamp, Consumption \(kWh\), Voltage \(V\), Current \(A\), Power factor/,
      }),
    ).toBeInTheDocument();
  });

  it('hides the optional Status column when no reading carries a status', () => {
    render(<ReadingsTable data={sampleData} loading={false} />);

    expect(
      screen.queryByRole('columnheader', { name: 'Status' }),
    ).not.toBeInTheDocument();
  });

  it('shows the Status column when the payload carries it', () => {
    render(
      <ReadingsTable
        data={[{ ...sampleData[0], status: 'OK' }]}
        loading={false}
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: 'Status' }),
    ).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: /Current \(A\), Power factor, Status/ }),
    ).toBeInTheDocument();
  });

  // This is the pagination contract `AnomalyTable` was aligned to: page size 10,
  // antd's own defaults, and reachable controls. If this changes, the two
  // tables are no longer consistent.
  it('paginates readings ten rows at a time with reachable controls', () => {
    const many: Reading[] = Array.from({ length: 25 }, (_unused, index) => ({
      ...sampleData[0],
      Timestamp: `2024-01-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
    }));

    const { container } = render(<ReadingsTable data={many} loading={false} />);

    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);

    const paginator = container.querySelector('.ant-pagination') as HTMLElement;
    expect(within(paginator).getByTitle('1')).toBeInTheDocument();
    expect(within(paginator).getByTitle('2')).toBeInTheDocument();
    expect(within(paginator).getByTitle('3')).toBeInTheDocument();
    expect(within(paginator).getByTitle('Next Page')).toBeInTheDocument();
    expect(within(paginator).getByTitle('Previous Page')).toBeInTheDocument();
  });
});

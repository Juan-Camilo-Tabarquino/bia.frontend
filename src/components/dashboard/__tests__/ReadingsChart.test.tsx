import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ReadingsChart, {
  type ReadingAnomalyMarker,
} from '../ReadingsChart';
import type { Reading } from '@/types/backend';

// recharts cannot measure a container in jsdom (getBoundingClientRect is 0),
// so render deterministic stand-ins that expose the props under test.
jest.mock('recharts', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    ResponsiveContainer: ({
      children,
      ...rest
    }: { children?: React.ReactNode } & Record<string, unknown>) =>
      ReactModule.createElement('div', rest, children),
    LineChart: ({
      data,
      children,
    }: {
      data?: Array<Record<string, unknown>>;
      children?: React.ReactNode;
    }) =>
      ReactModule.createElement(
        'div',
        {
          'data-testid': 'line-chart',
          'data-points': JSON.stringify(data ?? []),
        },
        children,
      ),
    Line: ({ dataKey }: { dataKey?: string }) =>
      ReactModule.createElement('div', {
        'data-testid': 'line',
        'data-key': dataKey,
      }),
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
  };
});

const sampleReadings: Reading[] = [
  {
    MeterID: 'M-101',
    Timestamp: '2024-01-01T00:00:00Z',
    Consumption: 10,
    Voltage: 230,
    Current: 5.4,
    PowerFactor: 0.98,
  },
  {
    MeterID: 'M-101',
    Timestamp: '2024-01-02T00:00:00Z',
    Consumption: 20,
    Voltage: 231,
    Current: 5.6,
    PowerFactor: 0.97,
  },
  {
    MeterID: 'M-101',
    Timestamp: '2024-01-03T00:00:00Z',
    Consumption: 30,
    Voltage: 232,
    Current: 5.8,
    PowerFactor: 0.96,
  },
];

const plottedPoints = (): Array<Record<string, unknown>> =>
  JSON.parse(
    screen.getByTestId('line-chart').getAttribute('data-points') ?? '[]',
  ) as Array<Record<string, unknown>>;

const plottedDataKeys = (): Array<string | null> =>
  screen
    .getAllByTestId('line')
    .map((line) => line.getAttribute('data-key'));

describe('ReadingsChart', () => {
  it('renders a labelled loading state when loading', () => {
    render(<ReadingsChart data={[]} loading={true} />);

    expect(screen.getByText(/Cargando gráfico/i)).toBeInTheDocument();
  });

  it('states that there are no readings instead of drawing an empty plot', () => {
    // Empty (null-narrowed) payloads must not leave a blank 300px plot: the
    // chart region explains the emptiness in Spanish.
    render(<ReadingsChart data={[]} />);

    expect(
      screen.getByText('No hay lecturas en el rango seleccionado.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: /Readings chart/i }),
    ).not.toBeInTheDocument();
  });

  it('exposes one image whose accessible name carries the unit of the signal', () => {
    render(<ReadingsChart data={sampleReadings} />);

    expect(
      screen.getByRole('img', {
        name: 'Readings chart: Consumption (kWh) over time',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Consumption in kWh over time/i),
    ).toBeInTheDocument();
  });

  it('offers one labelled control per signal and plots only the selected one', () => {
    render(<ReadingsChart data={sampleReadings} />);

    (
      [
        'Consumption (kWh)',
        'Voltage (V)',
        'Current (A)',
        'Power factor (dimensionless 0-1)',
      ] as const
    ).forEach((label) => {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    });

    const consumptionPoints = plottedPoints();
    expect(consumptionPoints).toHaveLength(sampleReadings.length);
    expect(consumptionPoints.map((point) => point.value)).toEqual([10, 20, 30]);

    fireEvent.click(screen.getByRole('radio', { name: 'Voltage (V)' }));

    expect(
      screen.getByRole('img', {
        name: 'Readings chart: Voltage (V) over time',
      }),
    ).toBeInTheDocument();
    expect(plottedPoints().map((point) => point.value)).toEqual([
      230, 231, 232,
    ]);
    // A single measurement series per chart: no second signal shares the axis.
    expect(plottedDataKeys()).toEqual(['value', 'anomalyValue']);
  });

  it('marks anomalies on the timeline at the nearest plotted reading', () => {
    const anomalyMarkers: ReadingAnomalyMarker[] = [
      { id: 'an-1', detectedAt: '2024-01-02T03:00:00Z', label: 'HIGH · Real anomaly' },
      { id: 'an-2', detectedAt: '2024-06-01T00:00:00Z', label: 'LOW · False positive' },
    ];

    render(
      <ReadingsChart data={sampleReadings} anomalyMarkers={anomalyMarkers} />,
    );

    // Only the marker inside the plotted window lands on the timeline, and it is
    // snapped to the closest reading (2024-01-02T00:00:00Z).
    const markedPoints = plottedPoints().filter(
      (point) => point.anomalyValue !== null,
    );
    expect(markedPoints).toHaveLength(1);
    expect(markedPoints[0].Timestamp).toBe('2024-01-02T00:00:00Z');
    expect(markedPoints[0].anomalyValue).toBe(20);

    // Every marker is still described in text, including the out-of-window one,
    // so the marker meaning never depends on colour alone.
    expect(screen.getByText('2024-01-02T03:00:00Z')).toBeInTheDocument();
    expect(screen.getByText('2024-06-01T00:00:00Z')).toBeInTheDocument();
    expect(
      screen.getAllByText(/HIGH · Real anomaly/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/LOW · False positive/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { name: /Anomaly markers/i, level: 2 }),
    ).toBeInTheDocument();
  });

  it('states that no anomaly markers exist when none are supplied', () => {
    render(<ReadingsChart data={sampleReadings} />);

    expect(screen.getByText(/No anomalies recorded for this meter/i)).toBeInTheDocument();
  });
});

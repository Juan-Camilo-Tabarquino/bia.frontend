import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ReadingsChart, {
  type ReadingAnomalyMarker,
} from '../ReadingsChart';
import { formatDateTime } from '@/components/formatters';
import { chartColors } from '@/theme/tokens';
import type { Reading } from '@/types/backend';

// recharts cannot measure a container in jsdom (getBoundingClientRect is 0),
// so render deterministic stand-ins that expose the props under test. The X
// axis and tooltip stand-ins apply the formatter the component passes, so the
// assertions can see what would be shown without any real SVG text. The probe
// timestamp is a literal inside the factory (a hoisted `jest.mock` factory
// cannot read a module-scope `const`).
jest.mock("recharts", () =>
  (
    jest.requireActual("@/test-support/rechartsMock") as typeof import("@/test-support/rechartsMock")
  ).createRechartsMock(),
);

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
      screen.queryByRole('img', { name: /Gráfico de lecturas/i }),
    ).not.toBeInTheDocument();
  });

  it('exposes one image whose accessible name carries the unit of the signal', () => {
    render(<ReadingsChart data={sampleReadings} />);

    expect(
      screen.getByRole('img', {
        name: 'Gráfico de lecturas: Consumo (kWh) a lo largo del tiempo',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Consumo en kWh a lo largo del tiempo/i),
    ).toBeInTheDocument();
  });

  it('offers one labelled control per signal and plots only the selected one', () => {
    render(<ReadingsChart data={sampleReadings} />);

    (
      [
        'Consumo (kWh)',
        'Voltaje (V)',
        'Corriente (A)',
        'Factor de potencia (adimensional 0-1)',
      ] as const
    ).forEach((label) => {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    });

    const consumptionPoints = plottedPoints();
    expect(consumptionPoints).toHaveLength(sampleReadings.length);
    expect(consumptionPoints.map((point) => point.value)).toEqual([10, 20, 30]);

    fireEvent.click(screen.getByRole('radio', { name: 'Voltaje (V)' }));

    expect(
      screen.getByRole('img', {
        name: 'Gráfico de lecturas: Voltaje (V) a lo largo del tiempo',
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

    const { container } = render(
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
    // so the marker meaning never depends on colour alone. The times go through
    // the shared formatter, so the raw RFC3339 string must be gone.
    expect(
      screen.getByText(formatDateTime('2024-01-02T03:00:00Z')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatDateTime('2024-06-01T00:00:00Z')),
    ).toBeInTheDocument();
    expect(screen.queryByText('2024-01-02T03:00:00Z')).not.toBeInTheDocument();
    expect(screen.queryByText('2024-06-01T00:00:00Z')).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/HIGH · Real anomaly/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/LOW · False positive/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { name: /Marcadores de anomalía/i, level: 2 }),
    ).toBeInTheDocument();

    // The sr-only figcaption interpolation goes through the shared formatter
    // too: its summary carries formatted times and no raw timestamp.
    const figcaption = container.querySelector('figcaption')?.textContent ?? '';
    expect(figcaption).toContain(formatDateTime('2024-01-02T03:00:00Z'));
    expect(figcaption).toContain(formatDateTime('2024-06-01T00:00:00Z'));
    expect(figcaption).not.toContain('2024-01-02T03:00:00Z');
    expect(figcaption).not.toContain('2024-06-01T00:00:00Z');
  });

  it('formats the axis ticks and the tooltip label without changing the axis key', () => {
    render(<ReadingsChart data={sampleReadings} />);

    // The category KEY stays the raw `Timestamp`: the marker snapping and the
    // plotted points depend on it, and the first point below still carries it.
    expect(screen.getByTestId('x-axis')).toHaveAttribute(
      'data-key',
      'Timestamp',
    );
    expect(plottedPoints()[0].Timestamp).toBe('2024-01-01T00:00:00Z');

    // Only the LABEL is formatted, and the default tooltip label too.
    expect(screen.getByTestId('x-axis')).toHaveAttribute(
      'data-tick-output',
      formatDateTime('2024-01-01T00:00:00Z'),
    );
    expect(screen.getByTestId('tooltip')).toHaveAttribute(
      'data-label-output',
      formatDateTime('2024-01-01T00:00:00Z'),
    );
    expect(screen.getByTestId('x-axis').getAttribute('data-tick-output')).not.toBe(
      '2024-01-01T00:00:00Z',
    );
  });

  it('states that no anomaly markers exist when none are supplied', () => {
    render(<ReadingsChart data={sampleReadings} />);

    expect(screen.getByText(/No hay anomalías registradas para este medidor/i)).toBeInTheDocument();
  });

  it('draws a dashed reference line at the DTO baseline mean for Consumption', () => {
    const anomalyMarkers: ReadingAnomalyMarker[] = [
      {
        id: 'an-1',
        detectedAt: '2024-01-02T03:00:00Z',
        label: 'HIGH · Real anomaly',
        baselineMean: 12.1,
      },
    ];

    render(<ReadingsChart data={sampleReadings} anomalyMarkers={anomalyMarkers} />);

    const lines = screen.getAllByTestId('reference-line');
    expect(lines).toHaveLength(1);
    // The Y value is the raw `baseline.mean`: it is plotted, never reformatted
    // or averaged.
    expect(lines[0]).toHaveAttribute('data-y', '12.1');
    expect(lines[0]).toHaveAttribute('data-stroke-dasharray', '6 4');
    // Colour comes from the token map: a CSS variable is not reliable in a
    // recharts SVG presentation attribute (svgwg#1031).
    expect(lines[0]).toHaveAttribute('data-stroke', chartColors.dark.reference);
  });

  it('withholds the consumption reference line on another signal and says why', () => {
    const anomalyMarkers: ReadingAnomalyMarker[] = [
      {
        id: 'an-1',
        detectedAt: '2024-01-02T03:00:00Z',
        label: 'HIGH · Real anomaly',
        baselineMean: 12.1,
      },
    ];

    render(<ReadingsChart data={sampleReadings} anomalyMarkers={anomalyMarkers} />);
    expect(screen.getAllByTestId('reference-line')).toHaveLength(1);

    fireEvent.click(screen.getByRole('radio', { name: 'Voltaje (V)' }));

    // `baseline.mean` is kWh consumption, so it must not sit on a voltage axis.
    expect(screen.queryAllByTestId('reference-line')).toHaveLength(0);
    expect(screen.getByText(/solo con la señal Consumo/i)).toBeInTheDocument();
  });

  it('draws one reference line per distinct baseline mean instead of averaging', () => {
    const anomalyMarkers: ReadingAnomalyMarker[] = [
      { id: 'an-1', detectedAt: '2024-01-02T03:00:00Z', label: 'HIGH', baselineMean: 12.1 },
      { id: 'an-2', detectedAt: '2024-01-03T03:00:00Z', label: 'MEDIUM', baselineMean: 18.4 },
      { id: 'an-3', detectedAt: '2024-01-03T04:00:00Z', label: 'LOW', baselineMean: 12.1 },
    ];

    render(<ReadingsChart data={sampleReadings} anomalyMarkers={anomalyMarkers} />);

    // Duplicates collapse, distinct DTO values each keep their own line, and no
    // invented average appears.
    expect(
      screen
        .getAllByTestId('reference-line')
        .map((line) => line.getAttribute('data-y')),
    ).toEqual(['12.1', '18.4']);
  });

  it('draws no reference line when no anomaly reaches the meter', () => {
    render(<ReadingsChart data={sampleReadings} />);

    expect(screen.queryAllByTestId('reference-line')).toHaveLength(0);
  });

  it('renders a legend naming the series, the anomaly markers and the reference line', () => {
    const anomalyMarkers: ReadingAnomalyMarker[] = [
      {
        id: 'an-1',
        detectedAt: '2024-01-02T03:00:00Z',
        label: 'HIGH · Real anomaly',
        baselineMean: 12.1,
      },
    ];

    render(<ReadingsChart data={sampleReadings} anomalyMarkers={anomalyMarkers} />);

    const legend = screen.getByRole('list', { name: 'Leyenda del gráfico' });
    expect(within(legend).getByText('Consumo (kWh)')).toBeInTheDocument();
    expect(within(legend).getByText('Marcador de anomalía')).toBeInTheDocument();
    expect(
      within(legend).getByText('Media de referencia: 12.1 kWh'),
    ).toBeInTheDocument();
  });

  it('prints the selected signal unit on the Y axis, and none for a dimensionless signal', () => {
    render(<ReadingsChart data={sampleReadings} />);
    expect(screen.getByTestId('y-axis')).toHaveAttribute('data-unit', 'kWh');

    fireEvent.click(screen.getByRole('radio', { name: 'Voltaje (V)' }));
    expect(screen.getByTestId('y-axis')).toHaveAttribute('data-unit', 'V');

    fireEvent.click(
      screen.getByRole('radio', { name: 'Factor de potencia (adimensional 0-1)' }),
    );
    expect(screen.getByTestId('y-axis')).toHaveAttribute('data-unit', '');
  });

  it('draws a soft grid and themes the tooltip from the token map', () => {
    render(<ReadingsChart data={sampleReadings} />);

    expect(screen.getByTestId('cartesian-grid')).toHaveAttribute(
      'data-stroke',
      chartColors.dark.grid,
    );
    expect(screen.getByTestId('cartesian-grid')).toHaveAttribute(
      'data-stroke-dasharray',
      '3 3',
    );

    const contentStyle = JSON.parse(
      screen.getByTestId('tooltip').getAttribute('data-content-style') ?? '{}',
    ) as Record<string, unknown>;
    expect(contentStyle.backgroundColor).toBe(
      chartColors.dark.tooltipBackground,
    );
    expect(contentStyle.color).toBe(chartColors.dark.tooltipText);
  });
});

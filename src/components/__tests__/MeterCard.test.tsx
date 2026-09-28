import React, { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { MeterCard } from '../MeterCard';
import { formatDateTime } from '@/components/formatters';
import type { Anomaly, MeterSummary } from '@/types/backend';

const meter: MeterSummary = {
  id: 'M-101',
  consumption: 2180.4,
  status: 'OK',
  readings_count: 336,
  last_reading_at: '2024-01-10T00:00:00Z',
};

const anomaly: Anomaly = {
  id: 'M-101-2026-09-12T14:00:00Z',
  meter_id: 'M-101',
  detected_at: '2026-09-12T14:00:00Z',
  type: 'REAL_ANOMALY',
  severity: 'HIGH',
  confidence: 0.97,
  reason: 'Sudden consumption spike',
  recommended_action: 'Inspect the meter',
  status: 'unexplained',
  priority: 1,
  baseline: {
    mean: 52.16,
    stddev: 20.84,
    count: 336,
    voltage_mean: 219.38,
    current_mean: 238.82,
    power_factor_mean: 0.905,
  },
  consumption_change_pct: 125.28,
  voltage_change_pct: -2.71,
  current_change_pct: 111.16,
  power_factor_change_pct: -18.16,
  correlated_events: [],
  data_quality: { flagged: false, reason: '' },
};

describe('MeterCard component', () => {
  // The accessible name must stay exactly the id and nothing else: every value
  // the card gained (badge, status, consumption, variation, last reading) lives
  // outside the anchor, never inside it.
  it('exposes exactly the meter id as the only link name', () => {
    render(<MeterCard meter={meter} anomaly={anomaly} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('M-101');
    expect(links[0]).toHaveTextContent(/^M-101$/);
    expect(links[0]).toHaveAttribute('href', '/meter/M-101');
  });

  it('encodes the meter id in the link href', () => {
    render(<MeterCard meter={{ ...meter, id: 'M-101 / A' }} />);

    expect(screen.getByRole('link', { name: 'M-101 / A' })).toHaveAttribute(
      'href',
      '/meter/M-101%20%2F%20A',
    );
  });

  it('renders the status label, the consumption with its unit and the last reading', () => {
    render(<MeterCard meter={meter} anomaly={anomaly} />);

    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Operativo')).toBeInTheDocument();
    expect(screen.getByText('Consumo')).toBeInTheDocument();
    expect(screen.getByText('2180.4 kWh')).toBeInTheDocument();
    expect(screen.getByText('Última lectura')).toBeInTheDocument();
    expect(
      screen.getByText(formatDateTime('2024-01-10T00:00:00Z')),
    ).toBeInTheDocument();
    // The raw wire value never replaces the Spanish label.
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('renders the DEGRADED member of the meter status map', () => {
    render(<MeterCard meter={{ ...meter, status: 'DEGRADED' }} />);

    expect(screen.getByText('Degradado')).toBeInTheDocument();
  });

  // The badge carries the raw severity next to its Spanish label, so a reader
  // cross-referencing the payload can still see `HIGH` -- the same contract the
  // anomaly table's Severidad column keeps.
  it('badges the joined anomaly with its raw severity and label', () => {
    render(<MeterCard meter={meter} anomaly={anomaly} />);

    expect(screen.getByText('HIGH · Alta')).toBeInTheDocument();
    expect(screen.getByText('Anomalía real')).toBeInTheDocument();
    expect(screen.getByText('Variación')).toBeInTheDocument();
    // The DTO value is shown verbatim, sign included.
    expect(screen.getByText('+125.3%')).toBeInTheDocument();
  });

  it('reports a meter with no joined anomaly instead of inventing a change', () => {
    render(<MeterCard meter={meter} />);

    expect(screen.getByText('Sin anomalías')).toBeInTheDocument();
    expect(screen.queryByText('Anomalía real')).not.toBeInTheDocument();
    // No anomaly means no variation to show; `0%` would be a measurement the API
    // never reported.
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/^\d+(\.\d+)?%$/)).not.toBeInTheDocument();
  });

  it('adds no second tab stop beyond the id link', () => {
    render(<MeterCard meter={meter} anomaly={anomaly} />);

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the resolved card under StrictMode', () => {
    render(
      <StrictMode>
        <MeterCard meter={meter} anomaly={anomaly} />
      </StrictMode>,
    );

    expect(screen.getByRole('link', { name: 'M-101' })).toBeInTheDocument();
    expect(screen.getByText('Operativo')).toBeInTheDocument();
  });
});

import { apiSlice } from '../apiSlice';

describe('apiSlice', () => {
  it('uses the "api" reducerPath', () => {
    expect(apiSlice.reducerPath).toBe('api');
  });

  it('exposes exactly the documented endpoints', () => {
    expect(Object.keys(apiSlice.endpoints).sort()).toEqual(
      [
        'getAnomalies',
        'getAnomalyById',
        'getDashboardSummary',
        'getMeterDetail',
        'getMeters',
      ].sort(),
    );
  });

  it('does not expose a getEvents endpoint', () => {
    expect(Object.keys(apiSlice.endpoints)).not.toContain('getEvents');
  });
});

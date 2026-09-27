import {
  ANALYSIS_POLL_INTERVAL_MS,
  dashboardApi,
  isAnalysisPending,
} from '../dashboardAPI';

describe('dashboardApi', () => {
  it('uses the "dashboardApi" reducerPath', () => {
    expect(dashboardApi.reducerPath).toBe('dashboardApi');
  });

  it('exposes exactly the analysis endpoints', () => {
    expect(Object.keys(dashboardApi.endpoints).sort()).toEqual([
      'getAiAnalysis',
      'postAnalyze',
    ]);
  });
});

describe('isAnalysisPending', () => {
  it('treats the two non-terminal statuses as pending', () => {
    expect(isAnalysisPending('queued')).toBe(true);
    expect(isAnalysisPending('running')).toBe(true);
  });

  it('treats every terminal status as not pending', () => {
    expect(isAnalysisPending('completed')).toBe(false);
    expect(isAnalysisPending('failed')).toBe(false);
  });

  it('treats an unrecognised status as not pending, so polling stops', () => {
    expect(isAnalysisPending('processing')).toBe(false);
    expect(isAnalysisPending('')).toBe(false);
    expect(isAnalysisPending(undefined)).toBe(false);
  });
});

describe('ANALYSIS_POLL_INTERVAL_MS', () => {
  it('is a positive number of milliseconds', () => {
    expect(typeof ANALYSIS_POLL_INTERVAL_MS).toBe('number');
    expect(ANALYSIS_POLL_INTERVAL_MS).toBeGreaterThan(0);
    expect(Number.isFinite(ANALYSIS_POLL_INTERVAL_MS)).toBe(true);
  });
});

import { dashboardApi } from '../dashboardAPI';

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

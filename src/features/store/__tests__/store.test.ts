import { store } from '../index';
import { apiSlice } from '../../api/apiSlice';
import { dataApi } from '../../data/dataAPI';
import { dashboardApi } from '../../dashboards/dashboardAPI';

describe('store wiring', () => {
  it('registers the three RTK Query reducer paths', () => {
    expect(Object.keys(store.getState())).toEqual(
      expect.arrayContaining(['api', 'dataApi', 'dashboardApi']),
    );
    expect(apiSlice.reducerPath).toBe('api');
    expect(dataApi.reducerPath).toBe('dataApi');
    expect(dashboardApi.reducerPath).toBe('dashboardApi');
  });

  it('has the RTK Query middleware wired for the api slice', () => {
    // With middleware present this internal action is intercepted and wrapped
    // (its `type` becomes an object); without it the raw action's string `type`
    // falls through and RTK Query reports the missing-middleware error.
    const probe = store.dispatch(
      apiSlice.internalActions.internal_getRTKQSubscriptions(),
    );

    expect(typeof (probe as { type: unknown }).type).not.toBe('string');
  });

  it('dispatches an unrelated action without throwing', () => {
    expect(() => store.dispatch({ type: 'test/noop' })).not.toThrow();
  });
});

import { dataApi } from '../dataAPI';

describe('dataApi', () => {
  it('uses the "dataApi" reducerPath', () => {
    expect(dataApi.reducerPath).toBe('dataApi');
  });

  it('exposes exactly the getMeterReadings endpoint', () => {
    expect(Object.keys(dataApi.endpoints).sort()).toEqual(['getMeterReadings']);
  });
});

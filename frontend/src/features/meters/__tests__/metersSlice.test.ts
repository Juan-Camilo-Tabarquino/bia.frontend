import metersReducer from '../metersSlice';

test('should return the initial state', () => {
  const initialState = { list: [] } as any;
  const state = metersReducer(undefined, { type: 'unknown' });
  expect(state).toEqual(initialState);
});

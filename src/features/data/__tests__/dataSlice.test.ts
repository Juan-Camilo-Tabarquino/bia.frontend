import dataReducer, { fetchData } from '../dataSlice';
import axios from 'axios';
import { AnyAction } from '@reduxjs/toolkit';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

test('should handle fetchData pending', () => {
  const state = dataReducer(undefined, fetchData.pending('', { start: '2020-01-01', end: '2020-01-02' }));
  expect(state.loading).toBe(true);
});

test('should handle fetchData fulfilled', () => {
  const payload = [{ id: 1 }];
  const state = dataReducer(undefined, fetchData.fulfilled(payload, '', { start: '2020-01-01', end: '2020-01-02' }));
  expect(state.loading).toBe(false);
  expect(state.records).toEqual(payload);
});

test('should handle fetchData rejected', () => {
  const error = { message: 'Network error' } as any;
  const state = dataReducer(undefined, fetchData.rejected(error, '', { start: '2020-01-01', end: '2020-01-02' }));
  expect(state.loading).toBe(false);
  expect(state.error).toBe('Network error');
});

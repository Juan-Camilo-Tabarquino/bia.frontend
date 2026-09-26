import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../api/apiSlice';
import { dashboardApi } from '../dashboards/dashboardAPI';
import { dataApi } from '../data/dataAPI';

export const store = configureStore({
  reducer: {
    // RTK Query API reducers
    [apiSlice.reducerPath]: apiSlice.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [dataApi.reducerPath]: dataApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      apiSlice.middleware,
      dashboardApi.middleware,
      dataApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

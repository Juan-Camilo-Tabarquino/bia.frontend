import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../api/apiSlice';

import metersReducer from '../meters/metersSlice';
import dataReducer from '../data/dataSlice';
import dashboardReducer from '../dashboards/dashboardSlice';

export const store = configureStore({
  reducer: {
    meters: metersReducer,
    data: dataReducer,
    dashboard: dashboardReducer,
    // RTK Query API reducer
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

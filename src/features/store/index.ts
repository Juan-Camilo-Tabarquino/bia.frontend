import { configureStore } from '@reduxjs/toolkit';
import metersReducer from '../meters/metersSlice';
import dataReducer from '../data/dataSlice';
import dashboardReducer from '../dashboards/dashboardSlice';

export const store = configureStore({
  reducer: {
    meters: metersReducer,
    data: dataReducer,
    dashboard: dashboardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

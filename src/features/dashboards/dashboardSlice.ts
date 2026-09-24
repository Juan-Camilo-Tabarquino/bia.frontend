import { Analysis } from "../../types/backend";
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchAnalysis = createAsyncThunk('dashboard/fetchAnalysis', async ({ start, end }: { start: string; end: string }) => {
  const res = await axios.get('/api/analysis', { params: { start, end } });
  return res.data;
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: { analysis: null as Analysis | null, loading: false, error: null as string | null | undefined },
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchAnalysis.pending, state => {
      state.loading = true;
    });
    builder.addCase(fetchAnalysis.fulfilled, (state, action) => {
      state.loading = false;
      state.analysis = action.payload;
    });
    builder.addCase(fetchAnalysis.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });
  },
});

export default dashboardSlice.reducer;

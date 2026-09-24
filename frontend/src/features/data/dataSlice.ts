import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const fetchData = createAsyncThunk('data/fetch', async ({ start, end }: { start: string; end: string }) => {
  const res = await axios.get('/api/records', { params: { start, end } });
  return res.data;
});

const dataSlice = createSlice({
  name: 'data',
  initialState: { records: [] as unknown[], loading: false, error: null as string | null | undefined },
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchData.pending, state => {
      state.loading = true;
    });
    builder.addCase(fetchData.fulfilled, (state, action) => {
      state.loading = false;
      state.records = action.payload;
    });
    builder.addCase(fetchData.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });
  },
});
export default dataSlice.reducer;
export { fetchData };

import { createSlice } from '@reduxjs/toolkit';

// The meters slice now stores the list of meters fetched via RTK Query.
// No async thunks are needed because components use useGetMetersQuery.
const metersSlice = createSlice({
  name: 'meters',
  initialState: { list: [] as any[] },
  reducers: {},
});

export default metersSlice.reducer;

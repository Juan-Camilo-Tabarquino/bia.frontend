import { Meter } from "../../types/backend";\n

import { createSlice } from '@reduxjs/toolkit';\n
// No async thunks are needed because components use useGetMetersQuery.
const metersSlice = createSlice({
  name: 'meters',
  initialState: { list: [] as Meter[] },
  reducers: {},
});

export default metersSlice.reducer;

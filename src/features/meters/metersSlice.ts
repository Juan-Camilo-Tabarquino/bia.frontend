import { Meter } from "../../types/backend";

import { createSlice } from "@reduxjs/toolkit";

// No async thunks are needed because components use useGetMetersQuery.
const metersSlice = createSlice({
  name: "meters",
  initialState: { list: [] as Meter[] },
  reducers: {},
});

export default metersSlice.reducer;

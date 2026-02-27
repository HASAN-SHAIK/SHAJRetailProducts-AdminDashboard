import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getActivityLogs } from "../../api/logs";

const initialState = {
  list: [],
  status: "idle",
  error: null
};

export const fetchLogs = createAsyncThunk("logs/fetch", async (params, thunkAPI) => {
  try {
    const response = await getActivityLogs(params);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to fetch logs");
  }
});

const logsSlice = createSlice({
  name: "logs",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLogs.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload?.data?.logs || action.payload?.logs || action.payload?.data || [];
      })
      .addCase(fetchLogs.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch logs";
      });
  }
});

export default logsSlice.reducer;

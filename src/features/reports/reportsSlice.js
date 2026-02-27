import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getGlobalReports } from "../../api/reports";

const initialState = {
  data: null,
  status: "idle",
  error: null
};

export const fetchReports = createAsyncThunk("reports/fetch", async (_, thunkAPI) => {
  try {
    const response = await getGlobalReports();
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to fetch reports");
  }
});

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload?.data || action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch reports";
      });
  }
});

export default reportsSlice.reducer;

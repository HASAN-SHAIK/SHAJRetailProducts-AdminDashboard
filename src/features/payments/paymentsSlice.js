import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getPayments } from "../../api/payments";

const initialState = {
  list: [],
  status: "idle",
  error: null
};

export const fetchPayments = createAsyncThunk("payments/fetch", async (params, thunkAPI) => {
  try {
    const response = await getPayments(params);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to fetch payments");
  }
});

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list =
          action.payload?.data?.payments || action.payload?.payments || action.payload?.data || [];
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch payments";
      });
  }
});

export default paymentsSlice.reducer;

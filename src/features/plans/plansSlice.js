import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getPlans, updatePlan } from "../../api/plans";

const initialState = {
  list: [],
  status: "idle",
  error: null
};

export const fetchPlans = createAsyncThunk("plans/fetch", async (_, thunkAPI) => {
  try {
    const response = await getPlans();
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to fetch plans");
  }
});

export const savePlan = createAsyncThunk("plans/save", async ({ id, payload }, thunkAPI) => {
  try {
    const response = await updatePlan(id, payload);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to update plan");
  }
});

const plansSlice = createSlice({
  name: "plans",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlans.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload?.data?.plans || action.payload?.plans || action.payload?.data || [];
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch plans";
      })
      .addCase(savePlan.fulfilled, (state, action) => {
        const updated = action.payload?.plan || action.payload;
        if (!updated) return;
        state.list = state.list.map((plan) => (plan.id === updated.id ? updated : plan));
      });
  }
});

export default plansSlice.reducer;

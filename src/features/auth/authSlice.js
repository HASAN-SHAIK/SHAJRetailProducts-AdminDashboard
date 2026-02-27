import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { loginAdmin, fetchAdminProfile, logoutAdmin } from "../../api/auth";

const initialState = {
  profile: JSON.parse(localStorage.getItem("shaj_admin_profile") || "null"),
  token: localStorage.getItem("shaj_admin_token"),
  status: "idle",
  error: null
};

export const login = createAsyncThunk("auth/login", async (payload, thunkAPI) => {
  try {
    const response = await loginAdmin(payload);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Login failed");
  }
});

export const loadProfile = createAsyncThunk("auth/profile", async (_, thunkAPI) => {
  try {
    const response = await fetchAdminProfile();
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Profile fetch failed");
  }
});

export const logout = createAsyncThunk("auth/logout", async (_, thunkAPI) => {
  try {
    await logoutAdmin();
    return true;
  } catch (error) {
    return thunkAPI.rejectWithValue(error?.response?.data?.message || "Logout failed");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        state.token = action.payload?.token || null;
        state.profile = action.payload?.admin || null;
        if (state.token) {
          localStorage.setItem("shaj_admin_token", state.token);
        }
        if (state.profile) {
          localStorage.setItem("shaj_admin_profile", JSON.stringify(state.profile));
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Login failed";
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.profile = action.payload?.admin || action.payload || null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.profile = null;
        state.token = null;
        localStorage.removeItem("shaj_admin_token");
        localStorage.removeItem("shaj_admin_profile");
      })
      .addCase(logout.rejected, (state) => {
        state.profile = null;
        state.token = null;
        localStorage.removeItem("shaj_admin_token");
        localStorage.removeItem("shaj_admin_profile");
      });
  }
});

export default authSlice.reducer;

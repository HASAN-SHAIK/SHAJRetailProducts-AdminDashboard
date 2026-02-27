import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { login } from "../features/auth/authSlice";

const AdminLogin = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error, token } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (token) {
      navigate("/admin/dashboard");
    }
  }, [token, navigate]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(login(form));
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Admin Login
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
            Sign in to manage SHAJ NextGen Technologies tenants.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Signing in..." : "Login"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminLogin;

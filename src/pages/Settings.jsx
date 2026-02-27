import React, { useContext, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  MenuItem,
  Stack
} from "@mui/material";
import ToastContext from "../components/common/ToastProvider";
import { registerPlatformAdmin } from "../api/auth";

const Settings = () => {
  const { showToast } = useContext(ToastContext);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "platform_admin"
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setStatus("loading");
    setError("");
    try {
      await registerPlatformAdmin(form);
      showToast("Admin created");
      setForm({ name: "", email: "", password: "", role: "platform_admin" });
      setStatus("succeeded");
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to create admin";
      setError(message);
      setStatus("failed");
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Settings
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            Settings and admin preferences can be configured here.
          </Typography>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Register Platform Admin
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Role"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              >
                <MenuItem value="platform_admin">Platform Admin</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Creating..." : "Create Admin"}
            </Button>
            {error && (
              <Typography variant="body2" sx={{ color: "#dc2626" }}>
                {error}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;

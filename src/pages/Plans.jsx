import React, { useEffect, useState, useContext } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchPlans, savePlan } from "../features/plans/plansSlice";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorState from "../components/common/ErrorState";
import ToastContext from "../components/common/ToastProvider";

const Plans = () => {
  const dispatch = useAppDispatch();
  const { list, status, error } = useAppSelector((state) => state.plans);
  const { showToast } = useContext(ToastContext);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    dispatch(fetchPlans());
  }, [dispatch]);

  const plans = list.length ? list : [];

  const formatPrice = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toFixed(2);
  };

  const formatPlanName = (name) =>
    typeof name === "string" ? name.charAt(0).toUpperCase() + name.slice(1) : name;

  const renderFeatureValue = (value) => {
    if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
  };

  const handleEdit = (plan) => {
    setCurrent({ ...plan });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!current) return;
    const payload = {
      name: current.name,
      price: current.price,
      duration_days: current.duration_days,
      is_active: current.is_active
    };
    await dispatch(savePlan({ id: current.id, payload }));
    setOpen(false);
    showToast("Plan updated");
  };

  if (status === "loading") return <LoadingSpinner />;
  if (status === "failed") return <ErrorState message={error} />;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Plans Management
      </Typography>
      <Grid container spacing={3}>
        {plans.map((plan) => (
          <Grid item xs={12} md={6} key={plan.id}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6">{formatPlanName(plan.name)}</Typography>
                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                      ₹{formatPrice(plan.price)} / {plan.duration_days || 30} days
                    </Typography>
                    <Typography variant="body2" sx={{ color: plan.is_active ? "#16a34a" : "#dc2626" }}>
                      {plan.is_active ? "Active" : "Inactive"}
                    </Typography>
                  </Box>
                  <Button variant="outlined" onClick={() => handleEdit(plan)}>
                    Edit
                  </Button>
                </Stack>
                <Box sx={{ mt: 2 }}>
                  {Object.entries(plan.features || {})
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, value]) => (
                    <Stack
                      key={key}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="body2">{key}</Typography>
                      <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 600 }}>
                        {renderFeatureValue(value)}
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Plan</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Plan Name"
            fullWidth
            value={current?.name || ""}
            onChange={(e) => setCurrent((prev) => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Price"
            type="number"
            fullWidth
            value={current?.price || 0}
            onChange={(e) => setCurrent((prev) => ({ ...prev, price: Number(e.target.value) }))}
          />
          <TextField
            margin="dense"
            label="Duration (days)"
            type="number"
            fullWidth
            value={current?.duration_days || 30}
            onChange={(e) =>
              setCurrent((prev) => ({ ...prev, duration_days: Number(e.target.value) }))
            }
          />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <Typography variant="body2">Active</Typography>
            <Switch
              checked={Boolean(current?.is_active)}
              onChange={(event) =>
                setCurrent((prev) => ({ ...prev, is_active: event.target.checked }))
              }
            />
          </Stack>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Features
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            Plan features are read-only and controlled by the backend.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Plans;

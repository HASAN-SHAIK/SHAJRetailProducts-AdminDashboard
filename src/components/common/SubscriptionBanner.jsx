import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "shaj_subscription_banner_dismissed";

const SubscriptionBanner = ({ subscription, billingPath = "/admin/payments" }) => {
  const navigate = useNavigate();
  const bannerKey = useMemo(() => {
    if (!subscription) return "";
    const parts = [
      subscription.plan_name,
      subscription.end_date,
      subscription.days_left,
      subscription.is_expiring,
      subscription.is_urgent,
      subscription.is_expired
    ];
    return parts.map((value) => String(value ?? "")).join("|");
  }, [subscription]);

  const [dismissed, setDismissed] = useState(() => {
    if (!bannerKey) return false;
    return sessionStorage.getItem(STORAGE_KEY) === bannerKey;
  });

  useEffect(() => {
    if (!bannerKey) {
      setDismissed(false);
      return;
    }
    setDismissed(sessionStorage.getItem(STORAGE_KEY) === bannerKey);
  }, [bannerKey]);

  if (!subscription || dismissed) return null;

  const { days_left, is_expiring, is_urgent, is_expired } = subscription;

  let message = "";
  let severity = "info";
  let background = undefined;

  if (is_expired) {
    message = "Your subscription has expired. Please renew immediately.";
    severity = "error";
    background = "#fee2e2";
  } else if (is_urgent) {
    message = `Your subscription expires in ${days_left} day(s). Renew now.`;
    severity = "warning";
    background = "#ffedd5";
  } else if (is_expiring) {
    message = `Your subscription will expire in ${days_left} days.`;
    severity = "info";
    background = "#fef9c3";
  } else {
    return null;
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, pt: 2 }}>
      <Alert
        severity={severity}
        sx={{
          alignItems: "center",
          backgroundColor: background,
          color: "#1f2937"
        }}
        action={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              color={is_expired ? "error" : "warning"}
              onClick={() => navigate(billingPath)}
            >
              Renew Now
            </Button>
            <IconButton
              size="small"
              aria-label="Dismiss subscription banner"
              onClick={() => {
                sessionStorage.setItem(STORAGE_KEY, bannerKey);
                setDismissed(true);
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        {message}
      </Alert>
    </Box>
  );
};

export default SubscriptionBanner;

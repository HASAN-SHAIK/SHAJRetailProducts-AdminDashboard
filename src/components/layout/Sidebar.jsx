import React from "react";
import { NavLink } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography
} from "@mui/material";
import { useAppSelector } from "../../app/hooks";
import DashboardIcon from "@mui/icons-material/Dashboard";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PaymentsIcon from "@mui/icons-material/Payments";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LayersIcon from "@mui/icons-material/Layers";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import { isFeatureEnabled } from "../../utils/featureFlags";

const navItems = [
  { label: "Dashboard", icon: <DashboardIcon />, to: "/admin/dashboard", featureKey: "advanced_reports" },
  { label: "Tenants", icon: <StorefrontIcon />, to: "/admin/tenants" },
  { label: "Reports", icon: <AssessmentIcon />, to: "/admin/reports", featureKey: "analytical_reports" },
  { label: "Payments", icon: <PaymentsIcon />, to: "/admin/payments" },
  { label: "Activity Logs", icon: <ListAltIcon />, to: "/admin/logs" },
  { label: "Plans", icon: <LayersIcon />, to: "/admin/plans" },
  { label: "Support Cases", icon: <SupportAgentIcon />, to: "/admin/support-cases" },
  { label: "Settings", icon: <SettingsIcon />, to: "/admin/settings" }
];

const Sidebar = ({ onLogout }) => {
  const selectedTenant = useAppSelector((state) => state.tenants.selected);
  const resolvedFeatures = selectedTenant?.resolvedFeatures || {};
  const filteredNavItems = navItems.filter((item) => {
    if (!item.featureKey) return true;
    return isFeatureEnabled(resolvedFeatures, item.featureKey, true);
  });

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 260,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: 260,
          boxSizing: "border-box",
          background: "linear-gradient(180deg, #0f172a 0%, #111827 40%, #0b1120 100%)",
          color: "#e2e8f0",
          borderRight: "1px solid rgba(148, 163, 184, 0.2)"
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ color: "#f8fafc" }}>
          SHAJ NextGen
        </Typography>
        <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
          Admin Console
        </Typography>
      </Box>
      <List sx={{ px: 2 }}>
        {filteredNavItems.map((item) => (
          <ListItemButton
            key={item.label}
            component={NavLink}
            to={item.to}
            sx={{
              color: "#e2e8f0",
              borderRadius: 2,
              mb: 1,
              "&.active": {
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                color: "#fff"
              }
            }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: "auto", p: 2 }}>
        <ListItemButton onClick={onLogout} sx={{ color: "#e2e8f0", borderRadius: 2 }}>
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </Drawer>
  );
};

export default Sidebar;

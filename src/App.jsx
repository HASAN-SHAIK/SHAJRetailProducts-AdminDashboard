import React from "react";
import { Navigate, Route, Routes, Outlet, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { logout } from "./features/auth/authSlice";
import AdminProtectedRoute from "./components/common/AdminProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import AdminLogin from "./pages/AdminLogin";
import DashboardHome from "./pages/DashboardHome";
import TenantsList from "./pages/TenantsList";
import TenantDetails from "./pages/TenantDetails";
import Reports from "./pages/Reports";
import Payments from "./pages/Payments";
import ActivityLogs from "./pages/ActivityLogs";
import Plans from "./pages/Plans";
import Settings from "./pages/Settings";
import SupportCases from "./pages/SupportCases";
import SupportCaseDetail from "./pages/SupportCaseDetail";

const AdminShell = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const profile = useAppSelector((state) => state.auth.profile);
  const subscription = profile?.subscription || profile?.tenant?.subscription || null;
  return (
    <DashboardLayout
      adminName={profile?.name || profile?.email}
      subscription={subscription}
      onLogout={() =>
        dispatch(logout())
          .unwrap()
          .catch(() => {})
          .finally(() => navigate("/admin/login"))
      }
    >
      <Outlet />
    </DashboardLayout>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminShell />}>
          <Route path="/admin/dashboard" element={<DashboardHome />} />
          <Route path="/admin/tenants" element={<TenantsList />} />
          <Route path="/admin/tenants/:id" element={<TenantDetails />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/payments" element={<Payments />} />
          <Route path="/admin/logs" element={<ActivityLogs />} />
          <Route path="/admin/plans" element={<Plans />} />
          <Route path="/admin/support-cases" element={<SupportCases />} />
          <Route path="/admin/support-cases/:id" element={<SupportCaseDetail />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};

export default App;
